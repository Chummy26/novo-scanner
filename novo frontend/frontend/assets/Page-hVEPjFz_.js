/* ========================================
 * Page Component
 * Wrapper que define o document.title da pagina
 * ======================================== */

import { a as React, j as jsx, a8 as APP_NAME } from "./index-Bx06KCE-.js";

/**
 * Hook that runs a cleanup function on unmount.
 */
function useUnmountEffect(cleanupFn) {
  const ref = React.useRef(cleanupFn);
  ref.current = cleanupFn;
  React.useEffect(
    () => () => {
      ref.current();
    },
    [],
  );
}

/**
 * Hook that sets the document title.
 * Optionally restores the previous title on unmount.
 */
function useDocumentTitle(title, options = {}) {
  const { preserveTitleOnUnmount = true } = options;
  const previousTitle = React.useRef(null);

  React.useLayoutEffect(() => {
    previousTitle.current = window.document.title;
  }, []);

  React.useLayoutEffect(() => {
    window.document.title = title;
  }, [title]);

  useUnmountEffect(() => {
    if (!preserveTitleOnUnmount && previousTitle.current) {
      window.document.title = previousTitle.current;
    }
  });
}

/**
 * Page wrapper component.
 * Sets the document title to "{title} - {APP_NAME}" and renders children.
 *
 * @param {string} title - The page title
 * @param {React.ComponentType} component - Optional wrapper component
 * @param {React.ReactNode} children - Page content
 */
function Page({ title = "", component, children, ...restProps }) {
  const Wrapper = component || React.Fragment;
  useDocumentTitle(`${title} - ${APP_NAME}`);

  return jsx.jsx(Wrapper, {
    ...restProps,
    children,
  });
}

export { Page as P, useUnmountEffect as u };
