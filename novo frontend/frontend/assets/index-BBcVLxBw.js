/* ========================================
 * Double-Panel Sidebar Layout
 * Layout com sidebar principal + sub-painel de navegacao
 * ======================================== */

import {
  M as v,
  V as y,
  ae as w,
  j as t,
  Z as N,
  e as u,
  f as b,
  ab as M,
  ak as A,
  al as C,
  a as p,
  am as I,
  a2 as j,
  an as P,
  u as S,
  B as D,
  X as F,
  ao as L,
  h as R,
  ap as B,
  $ as T,
} from "./index-Bx06KCE-.js";
import { M as z, H as E } from "./index-DqFyO0CR.js";
import { u as k, a as K } from "./UserSettingsModal-CzYn2rcs.js";
import { A as $, i as f, S as H, f as O } from "./navigation-Dzggl1Hr.js";
import { F as V } from "./ChevronLeftIcon-UrS6hBlQ.js";
import { F as q } from "./ChevronRightIcon-EvEZ5GcB.js";
import "./transition-Cxix63ts.js";
import "./use-is-mounted-D7iMJT5-.js";
import "./dialog-DOjFQwF9.js";
import "./MagnifyingGlassIcon-DA0XI0aS.js";
import "./CurrencyDollarIcon-DU3HPuAk.js";
import "./CalendarIcon-BAdYkhA_.js";
import "./XMarkIcon-mqVC0SZA.js";
import "./listbox-BwGC_4fO.js";
import "./use-resolve-button-type-DwKZeOeP.js";
import "./radio-group-CRUASA4L.js";
import "./label-DDDQpD4Z.js";
import "./floating-CA5b9ljT.js";
import "./floating-ui.dom-DmqE9iVV.js";
import "./use-text-value-ChvRIfBi.js";
import "./teamopLogoBlack-DzW8yP3A.js";
import "./Cog6ToothIcon-EOZD7MO5.js";
import "./index-C5vO_a11.js";
import "./iconBase-BPc6woXW.js";
import "./discordLink-BQxtRaU4.js";
import "./discord-BL8Te9RE.js";
import "./tabs-Cdkz3LDK.js";
import "./index-mwGaaYkF.js";
import "./UserIcon-B-URsuU3.js";
import "./WalletIcon-BygHaYK8.js";
import "./ShieldCheckIcon-BsJEEeR_.js";
import "./CreditCardIcon-BLR1nsX7.js";
import "./authApi-ObFgLF0e.js";
import "./userPreferences-DJ2q-do7.js";
import "./KeyIcon-CgJXeIvo.js";

/* ---- Sub-Panel Menu Item (leaf node) ---- */

function U({ data: e }) {
  const { transKey: translationKey, path: routePath, id: itemId } = e,
    { lgAndDown: isMobile } = v(),
    { close: closeSidebar } = y(),
    { t: translate } = k(),
    displayLabel = translationKey ? translate(translationKey) : e.title,
    badgeInfo = w("root")?.[itemId]?.info,
    handleClick = () => {
      isMobile && closeSidebar();
    };
  return t.jsx(N, {
    to: routePath,
    onClick: handleClick,
    id: itemId,
    className: ({ isActive: isCurrentRoute }) =>
      u(
        "text-xs-plus flex items-center justify-between px-2 tracking-wide outline-hidden transition-[color,padding-left,padding-right] duration-300 ease-in-out hover:ltr:pl-4 hover:rtl:pr-4",
        isCurrentRoute
          ? "text-primary-600 dark:text-primary-400 font-medium"
          : "dark:text-dark-200 dark:hover:text-dark-50 dark:focus:text-dark-50 text-gray-600 hover:text-gray-900 focus:text-gray-900",
      ),
    children: ({ isActive: isCurrentRoute }) =>
      t.jsxs("div", {
        "data-menu-active": isCurrentRoute,
        className: "flex min-w-0 items-center justify-between",
        style: {
          height: "34px",
        },
        children: [
          t.jsxs("div", {
            className:
              "flex min-w-0 items-center space-x-2 rtl:space-x-reverse",
            children: [
              t.jsx("div", {
                className: u(
                  isCurrentRoute
                    ? "bg-primary-600 dark:bg-primary-400 opacity-80"
                    : "opacity-50 transition-all",
                  "size-1.5 rounded-full border border-current",
                ),
              }),
              t.jsx("span", {
                className: "truncate",
                children: displayLabel,
              }),
            ],
          }),
          badgeInfo &&
            badgeInfo.val &&
            t.jsx(b, {
              color: badgeInfo.color,
              className: "h-5 min-w-[1.25rem] shrink-0 rounded-full p-[5px]",
              children: badgeInfo.val,
            }),
        ],
      }),
  });
}

/* ---- Sub-Panel Collapsible Group ---- */

function X({ data: e }) {
  const { id: groupId, path: groupPath, childs: childItems, transKey: translationKey } = e,
    { t: translate } = k(),
    { isRtl: isRightToLeft } = M(),
    displayLabel = translationKey ? translate(translationKey) : e.title,
    ChevronIcon = isRightToLeft ? V : q;
  if (!childItems) throw "The collapsible item must have childs";
  return t.jsx(A, {
    value: groupPath ?? groupId,
    children: ({ open: isOpen }) =>
      t.jsxs(t.Fragment, {
        children: [
          t.jsxs(C, {
            className: u(
              "text-xs-plus flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 py-2 text-start tracking-wide outline-hidden transition-[color,padding-left,padding-right] duration-300 ease-in-out",
              isOpen
                ? "dark:text-dark-50 font-semibold text-gray-800"
                : "dark:text-dark-200 dark:hover:text-dark-50 dark:focus:text-dark-50 text-gray-600 hover:text-gray-800 focus:text-gray-800",
            ),
            children: [
              t.jsx("span", {
                className: "truncate",
                children: displayLabel,
              }),
              t.jsx(ChevronIcon, {
                className: u(
                  "dark:text-dark-200 size-4 text-gray-400 transition-transform ease-in-out",
                  isOpen && [isRightToLeft ? "-rotate-90" : "rotate-90"],
                ),
              }),
            ],
          }),
          t.jsx($, {
            children: childItems.map((childItem) =>
              t.jsx(
                U,
                {
                  data: childItem,
                },
                childItem.path,
              ),
            ),
          }),
        ],
      }),
  });
}

/* ---- Sub-Panel Simple Menu Item (top level) ---- */

function Z({ data: e }) {
  const { path: routePath, transKey: translationKey, id: itemId, title: itemTitle } = e,
    { t: translate } = k(),
    { lgAndDown: isMobile } = v(),
    { close: closeSidebar } = y(),
    displayLabel = translate(translationKey ?? "") || itemTitle,
    badgeInfo = w("root")?.[itemId]?.info,
    handleClick = () => {
      isMobile && closeSidebar();
    };
  return t.jsx(N, {
    to: routePath,
    onClick: handleClick,
    className: ({ isActive: isCurrentRoute }) =>
      u(
        "outline-hidden transition-colors duration-300 ease-in-out",
        isCurrentRoute
          ? "font-medium text-primary-600 dark:text-primary-400"
          : "text-gray-600 hover:text-gray-900 dark:text-dark-200 dark:hover:text-dark-50",
      ),
    children: ({ isActive: isCurrentRoute }) =>
      t.jsxs("div", {
        "data-menu-active": isCurrentRoute,
        style: {
          height: "34px",
        },
        className:
          "flex items-center justify-between text-xs-plus tracking-wide",
        children: [
          t.jsx("span", {
            className: "mr-1 truncate",
            children: displayLabel,
          }),
          badgeInfo?.val &&
            t.jsx(b, {
              color: badgeInfo.color,
              variant: "soft",
              className: "h-4.5 min-w-[1rem] shrink-0 p-[5px] text-tiny-plus",
              children: badgeInfo.val,
            }),
        ],
      }),
  });
}

/* ---- Sub-Panel Divider ---- */

function G() {
  return t.jsx("div", {
    className: "my-2.5 h-px bg-gray-200 dark:bg-dark-500",
  });
}

/* ---- Sub-Panel Navigation List ---- */

function J({ nav: navItems, pathname: currentPathname }) {
  const initialActivePath = p.useMemo(() => navItems.find((item) => f(item.path, currentPathname))?.path ?? "", [navItems, currentPathname]),
    { ref: scrollRef } = I({
      updateDeps: navItems,
    }),
    [activeAccordionPath, setActiveAccordionPath] = p.useState(initialActivePath);
  return (
    j(() => {
      const matchedPath = navItems.find((item) => f(item.path, currentPathname))?.path;
      matchedPath && activeAccordionPath !== matchedPath && setActiveAccordionPath(matchedPath);
    }, [navItems, currentPathname]),
    p.useLayoutEffect(() => {
      scrollRef?.current?.querySelector("[data-menu-active=true]")?.scrollIntoView({
        block: "center",
      });
    }, []),
    t.jsx(P, {
      value: activeAccordionPath,
      onChange: setActiveAccordionPath,
      className: "flex flex-col overflow-hidden",
      children: t.jsx(H, {
        scrollableNodeProps: {
          ref: scrollRef,
        },
        className: "h-full overflow-x-hidden pb-6",
        style: {
          "--scroll-shadow-size": "32px",
        },
        children: t.jsx("div", {
          className: "flex h-full flex-1 flex-col px-4",
          children: navItems.map((navItem) => {
            switch (navItem.type) {
              case "collapse":
                return t.jsx(
                  X,
                  {
                    data: navItem,
                  },
                  navItem.path,
                );
              case "item":
                return t.jsx(
                  Z,
                  {
                    data: navItem,
                  },
                  navItem.path,
                );
              case "divider":
                return t.jsx(G, {}, navItem.id);
              default:
                return null;
            }
          }),
        }),
      }),
    })
  );
}

/* ---- Sub-Panel Container (right side of sidebar) ---- */

function Q({ currentSegment: activeSegment, pathname: currentPathname, close: closeSidebar }) {
  const { cardSkin: skinVariant } = S(),
    { t: translate } = k(),
    segmentLabel = translate(activeSegment?.transKey ?? "") || activeSegment?.title;
  return t.jsx("div", {
    className: u(
      "prime-panel flex h-full flex-col",
      skinVariant === "shadow"
        ? "shadow-soft dark:shadow-dark-900/60"
        : "dark:border-dark-600/80 ltr:border-r rtl:border-l",
    ),
    children: t.jsxs("div", {
      className: u(
        "flex h-full grow flex-col bg-white ltr:pl-(--main-panel-width) rtl:pr-(--main-panel-width)",
        skinVariant === "shadow" ? "dark:bg-dark-750" : "dark:bg-dark-900",
      ),
      children: [
        /* Sub-Panel Header */
        t.jsxs("div", {
          className:
            "relative flex h-16 w-full shrink-0 items-center justify-between pl-4 pr-1 rtl:pl-1 rtl:pr-4",
          children: [
            t.jsx("p", {
              className:
                "truncate text-base tracking-wider text-gray-800 dark:text-dark-100",
              children: segmentLabel,
            }),
            t.jsx(D, {
              onClick: closeSidebar,
              isIcon: !0,
              variant: "flat",
              className: "size-7 rounded-full xl:hidden",
              children: t.jsx(F, {
                className: "size-6 rtl:rotate-180",
              }),
            }),
          ],
        }),
        /* Sub-Panel Navigation */
        activeSegment?.childs &&
          t.jsx(J, {
            nav: activeSegment.childs,
            pathname: currentPathname,
          }),
      ],
    }),
  });
}

/* ---- Full Sidebar Component ---- */

function W() {
  const { pathname: currentPathname } = L(),
    { name: breakpointName, lgAndDown: isMobile } = v(),
    { isExpanded: isSidebarExpanded, close: closeSidebar } = y(),
    { user: currentUser } = R(),
    userLicenseMap = p.useMemo(() => B(currentUser), [currentUser]),
    navigationSegments = p.useMemo(() => {
      const userRoles = currentUser?.roles || [],
        userPermissions = currentUser?.permissions || [];
      return O(K, userRoles, userPermissions, userLicenseMap);
    }, [currentUser, userLicenseMap]),
    activeTopSegment = p.useMemo(() => navigationSegments.find((segment) => f(segment.path, currentPathname)), [navigationSegments]),
    [selectedSegmentPath, setSelectedSegmentPath] = p.useState(activeTopSegment?.path),
    currentSubSegment = p.useMemo(() => navigationSegments.find((segment) => segment.path === selectedSegmentPath), [selectedSegmentPath, navigationSegments]);
  return (
    /* Sync selected segment with route changes */
    j(() => {
      const matchedPath = navigationSegments.find((segment) => f(segment.path, currentPathname))?.path;
      setSelectedSegmentPath(matchedPath);
    }, [currentPathname, navigationSegments]),
    /* Close sidebar on mobile breakpoint change */
    j(() => {
      isMobile && isSidebarExpanded && closeSidebar();
    }, [breakpointName]),
    t.jsxs(t.Fragment, {
      children: [
        /* Main Navigation Panel (left icons) */
        t.jsx(z, {
          nav: navigationSegments,
          activeSegmentPath: selectedSegmentPath,
          setActiveSegmentPath: setSelectedSegmentPath,
        }),
        /* Sub-Navigation Panel (right side) */
        t.jsx(Q, {
          close: closeSidebar,
          currentSegment: currentSubSegment,
          pathname: currentPathname,
        }),
      ],
    })
  );
}

/* ---- Layout Root Component ---- */

function Lt() {
  return t.jsxs(t.Fragment, {
    children: [
      t.jsx(E, {}),
      t.jsx("main", {
        className: u("main-content transition-content grid grid-cols-1"),
        children: t.jsx(T, {}),
      }),
      t.jsx(W, {}),
    ],
  });
}
export { Lt as default };
