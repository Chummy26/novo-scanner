import {
  $ as Z,
  a as fe,
  w as pe,
  e as be,
} from "./use-resolve-button-type-DwKZeOeP.js";
import { a as o, R as F } from "./index-Bx06KCE-.js";
import {
  v as xe,
  z as ee,
  B as ge,
  Y as U,
  g as q,
  y as W,
  a as N,
  o as E,
  n as K,
  K as V,
  V as te,
  u as G,
  A as Q,
  t as ve,
  e as P,
  F as C,
  T,
  L as z,
  S as me,
  G as B,
} from "./use-is-mounted-D7iMJT5-.js";

/* ---- FocusSentinel Component (initial focus helper when no tabs exist) ---- */
function Pe({ onFocus: focusHandler }) {
  let [isVisible, setIsVisible] = o.useState(!0),
    isMountedRef = xe();
  return isVisible
    ? F.createElement(ee, {
        as: "button",
        type: "button",
        features: ge.Focusable,
        onFocus: (event) => {
          event.preventDefault();
          let animationFrameId,
            maxAttempts = 50;
          function attemptFocus() {
            if (maxAttempts-- <= 0) {
              if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
              }
              return;
            }
            if (focusHandler()) {
              if ((cancelAnimationFrame(animationFrameId), !isMountedRef.current)) return;
              setIsVisible(!1);
              return;
            }
            animationFrameId = requestAnimationFrame(attemptFocus);
          }
          animationFrameId = requestAnimationFrame(attemptFocus);
        },
      })
    : null;
}

/* ---- StableCollection Context (ordering helper for SSR-safe index tracking) ---- */
const re = o.createContext(null);
function Te() {
  return {
    groups: new Map(),
    get(groupName, elementId) {
      var currentCount;
      let group = this.groups.get(groupName);
      group || ((group = new Map()), this.groups.set(groupName, group));
      let count = (currentCount = group.get(elementId)) != null ? currentCount : 0;
      group.set(elementId, count + 1);
      let index = Array.from(group.keys()).indexOf(elementId);
      function cleanup() {
        let existingCount = group.get(elementId);
        existingCount > 1 ? group.set(elementId, existingCount - 1) : group.delete(elementId);
      }
      return [index, cleanup];
    },
  };
}
function he({ children: children }) {
  let collectionRef = o.useRef(Te());
  return o.createElement(
    re.Provider,
    {
      value: collectionRef,
    },
    children,
  );
}
function ne(groupName) {
  let collectionRef = o.useContext(re);
  if (!collectionRef)
    throw new Error("You must wrap your component in a <StableCollection>");
  let instanceId = o.useId(),
    [stableIndex, cleanupFn] = collectionRef.current.get(groupName, instanceId);
  return (o.useEffect(() => cleanupFn, []), stableIndex);
}

/* ---- Tab Direction and Comparison Enums ---- */
var $e = ((e) => (
    (e[(e.Forwards = 0)] = "Forwards"),
    (e[(e.Backwards = 1)] = "Backwards"),
    e
  ))($e || {}),
  Ie = ((e) => (
    (e[(e.Less = -1)] = "Less"),
    (e[(e.Equal = 0)] = "Equal"),
    (e[(e.Greater = 1)] = "Greater"),
    e
  ))(Ie || {}),

/* ---- Tab Action Types ---- */
  ye = ((e) => (
    (e[(e.SetSelectedIndex = 0)] = "SetSelectedIndex"),
    (e[(e.RegisterTab = 1)] = "RegisterTab"),
    (e[(e.UnregisterTab = 2)] = "UnregisterTab"),
    (e[(e.RegisterPanel = 3)] = "RegisterPanel"),
    (e[(e.UnregisterPanel = 4)] = "UnregisterPanel"),
    e
  ))(ye || {});

/* ---- Tab State Reducer Handlers ---- */
let we = {
    /* SetSelectedIndex */
    0(state, action) {
      var foundIndex;
      let sortedTabs = B(state.tabs, (tabRef) => tabRef.current),
        sortedPanels = B(state.panels, (panelRef) => panelRef.current),
        enabledTabs = sortedTabs.filter((tabRef) => {
          var tabElement;
          return !((tabElement = tabRef.current) != null && tabElement.hasAttribute("disabled"));
        }),
        nextState = {
          ...state,
          tabs: sortedTabs,
          panels: sortedPanels,
        };
      if (action.index < 0 || action.index > sortedTabs.length - 1) {
        let direction = G(Math.sign(action.index - state.selectedIndex), {
          [-1]: () => 1,
          0: () =>
            G(Math.sign(action.index), {
              [-1]: () => 0,
              0: () => 0,
              1: () => 1,
            }),
          1: () => 0,
        });
        if (enabledTabs.length === 0) return nextState;
        let resolvedIndex = G(direction, {
          0: () => sortedTabs.indexOf(enabledTabs[0]),
          1: () => sortedTabs.indexOf(enabledTabs[enabledTabs.length - 1]),
        });
        return {
          ...nextState,
          selectedIndex: resolvedIndex === -1 ? state.selectedIndex : resolvedIndex,
        };
      }
      let tabsBefore = sortedTabs.slice(0, action.index),
        candidateTab = [...sortedTabs.slice(action.index), ...tabsBefore].find((tabRef) => enabledTabs.includes(tabRef));
      if (!candidateTab) return nextState;
      let selectedIndex = (foundIndex = sortedTabs.indexOf(candidateTab)) != null ? foundIndex : state.selectedIndex;
      return (
        selectedIndex === -1 && (selectedIndex = state.selectedIndex),
        {
          ...nextState,
          selectedIndex: selectedIndex,
        }
      );
    },
    /* RegisterTab */
    1(state, action) {
      if (state.tabs.includes(action.tab)) return state;
      let currentSelectedTab = state.tabs[state.selectedIndex],
        updatedTabs = B([...state.tabs, action.tab], (tabRef) => tabRef.current),
        newSelectedIndex = state.selectedIndex;
      return (
        state.info.current.isControlled ||
          ((newSelectedIndex = updatedTabs.indexOf(currentSelectedTab)), newSelectedIndex === -1 && (newSelectedIndex = state.selectedIndex)),
        {
          ...state,
          tabs: updatedTabs,
          selectedIndex: newSelectedIndex,
        }
      );
    },
    /* UnregisterTab */
    2(state, action) {
      return {
        ...state,
        tabs: state.tabs.filter((tabRef) => tabRef !== action.tab),
      };
    },
    /* RegisterPanel */
    3(state, action) {
      return state.panels.includes(action.panel)
        ? state
        : {
            ...state,
            panels: B([...state.panels, action.panel], (panelRef) => panelRef.current),
          };
    },
    /* UnregisterPanel */
    4(state, action) {
      return {
        ...state,
        panels: state.panels.filter((panelRef) => panelRef !== action.panel),
      };
    },
  },

/* ---- TabsDataContext ---- */
  H = o.createContext(null);
H.displayName = "TabsDataContext";
function k(componentName) {
  let tabsData = o.useContext(H);
  if (tabsData === null) {
    let error = new Error(`<${componentName} /> is missing a parent <Tab.Group /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(error, k), error);
  }
  return tabsData;
}

/* ---- TabsActionsContext ---- */
let Y = o.createContext(null);
Y.displayName = "TabsActionsContext";
function J(componentName) {
  let tabsActions = o.useContext(Y);
  if (tabsActions === null) {
    let error = new Error(`<${componentName} /> is missing a parent <Tab.Group /> component.`);
    throw (Error.captureStackTrace && Error.captureStackTrace(error, J), error);
  }
  return tabsActions;
}

/* ---- Tabs Reducer ---- */
function Ee(state, action) {
  return G(action.type, we, state, action);
}

/* ---- Tab.Group Component ---- */
let Se = "div";
function Ae(props, ref) {
  let {
    defaultIndex: defaultIndex = 0,
    vertical: isVertical = !1,
    manual: isManual = !1,
    onChange: onChange,
    selectedIndex: controlledSelectedIndex = null,
    ...restProps
  } = props;
  const orientation = isVertical ? "vertical" : "horizontal",
    activation = isManual ? "manual" : "auto";
  let isControlled = controlledSelectedIndex !== null,
    infoRef = q({
      isControlled: isControlled,
    }),
    mergedRef = W(ref),
    [tabsState, dispatch] = o.useReducer(Ee, {
      info: infoRef,
      selectedIndex: controlledSelectedIndex ?? defaultIndex,
      tabs: [],
      panels: [],
    }),
    slotData = N({
      selectedIndex: tabsState.selectedIndex,
    }),
    onChangeRef = q(onChange || (() => {})),
    tabRefsRef = q(tabsState.tabs),
    contextData = o.useMemo(
      () => ({
        orientation: orientation,
        activation: activation,
        ...tabsState,
      }),
      [orientation, activation, tabsState],
    ),
    registerTab = E(
      (tabRef) => (
        dispatch({
          type: 1,
          tab: tabRef,
        }),
        () =>
          dispatch({
            type: 2,
            tab: tabRef,
          })
      ),
    ),
    registerPanel = E(
      (panelRef) => (
        dispatch({
          type: 3,
          panel: panelRef,
        }),
        () =>
          dispatch({
            type: 4,
            panel: panelRef,
          })
      ),
    ),
    changeSelectedIndex = E((newIndex) => {
      if (lastSelectedIndexRef.current !== newIndex) {
        onChangeRef.current(newIndex);
      }
      isControlled ||
        dispatch({
          type: 0,
          index: newIndex,
        });
    }),
    lastSelectedIndexRef = q(isControlled ? props.selectedIndex : tabsState.selectedIndex),
    actions = o.useMemo(
      () => ({
        registerTab: registerTab,
        registerPanel: registerPanel,
        change: changeSelectedIndex,
      }),
      [],
    );
  K(() => {
    dispatch({
      type: 0,
      index: controlledSelectedIndex ?? defaultIndex,
    });
  }, [controlledSelectedIndex]);
  K(() => {
    if (lastSelectedIndexRef.current === void 0 || tabsState.tabs.length <= 0) return;
    let sortedTabs = B(tabsState.tabs, (tabRef) => tabRef.current);
    if (sortedTabs.some((tabRef, index) => tabsState.tabs[index] !== tabRef)) {
      changeSelectedIndex(sortedTabs.indexOf(tabsState.tabs[lastSelectedIndexRef.current]));
    }
  });
  let ourProps = {
      ref: mergedRef,
    },
    render = V();
  return F.createElement(
    he,
    null,
    F.createElement(
      Y.Provider,
      {
        value: actions,
      },
      F.createElement(
        H.Provider,
        {
          value: contextData,
        },
        contextData.tabs.length <= 0 &&
          F.createElement(Pe, {
            onFocus: () => {
              var tabElement, focusTarget;
              for (let tabRef of tabRefsRef.current)
                if (((tabElement = tabRef.current) == null ? void 0 : tabElement.tabIndex) === 0)
                  return ((focusTarget = tabRef.current) == null || focusTarget.focus(), !0);
              return !1;
            },
          }),
        render({
          ourProps: ourProps,
          theirProps: restProps,
          slot: slotData,
          defaultTag: Se,
          name: "Tabs",
        }),
      ),
    ),
  );
}

/* ---- Tab.List Component ---- */
let Ce = "div";
function Fe(props, ref) {
  let { orientation: orientation, selectedIndex: selectedIndex } = k("Tab.List"),
    mergedRef = W(ref),
    slotData = N({
      selectedIndex: selectedIndex,
    }),
    theirProps = props,
    ourProps = {
      ref: mergedRef,
      role: "tablist",
      "aria-orientation": orientation,
    };
  return V()({
    ourProps: ourProps,
    theirProps: theirProps,
    slot: slotData,
    defaultTag: Ce,
    name: "Tabs.List",
  });
}

/* ---- Tab Component ---- */
let ke = "button";
function De(props, ref) {
  var panelRef, panelElement;
  let generatedId = o.useId(),
    {
      id: tabId = `headlessui-tabs-tab-${generatedId}`,
      disabled: isDisabled = !1,
      autoFocus: autoFocus = !1,
      ...restProps
    } = props,
    {
      orientation: orientation,
      activation: activation,
      selectedIndex: selectedIndex,
      tabs: allTabs,
      panels: allPanels,
    } = k("Tab"),
    tabsActions = J("Tab"),
    tabsData = k("Tab"),
    [resolvedElement, setResolvedElement] = o.useState(null),
    elementRef = o.useRef(null),
    mergedRef = W(elementRef, ref, setResolvedElement);
  K(() => tabsActions.registerTab(elementRef), [tabsActions, elementRef]);
  let stableIndex = ne("tabs"),
    tabIndex = allTabs.indexOf(elementRef);
  if (tabIndex === -1) {
    tabIndex = stableIndex;
  }
  let isSelected = tabIndex === selectedIndex,
    handleFocusResult = E((focusFn) => {
      let result = focusFn();
      if (result === z.Success && activation === "auto") {
        let activeElement = me(elementRef.current),
          activeTabIndex = tabsData.tabs.findIndex((tabRef) => tabRef.current === activeElement);
        if (activeTabIndex !== -1) {
          tabsActions.change(activeTabIndex);
        }
      }
      return result;
    }),
    handleKeyDown = E((keyEvent) => {
      let tabElements = allTabs.map((tabRef) => tabRef.current).filter(Boolean);
      if (keyEvent.key === P.Space || keyEvent.key === P.Enter) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        tabsActions.change(tabIndex);
        return;
      }
      switch (keyEvent.key) {
        case P.Home:
        case P.PageUp:
          return (
            keyEvent.preventDefault(),
            keyEvent.stopPropagation(),
            handleFocusResult(() => C(tabElements, T.First))
          );
        case P.End:
        case P.PageDown:
          return (
            keyEvent.preventDefault(),
            keyEvent.stopPropagation(),
            handleFocusResult(() => C(tabElements, T.Last))
          );
      }
      if (
        handleFocusResult(() =>
          G(orientation, {
            vertical() {
              if (keyEvent.key === P.ArrowUp) {
                return C(tabElements, T.Previous | T.WrapAround);
              }
              if (keyEvent.key === P.ArrowDown) {
                return C(tabElements, T.Next | T.WrapAround);
              }
              return z.Error;
            },
            horizontal() {
              if (keyEvent.key === P.ArrowLeft) {
                return C(tabElements, T.Previous | T.WrapAround);
              }
              if (keyEvent.key === P.ArrowRight) {
                return C(tabElements, T.Next | T.WrapAround);
              }
              return z.Error;
            },
          }),
        ) === z.Success
      )
        return keyEvent.preventDefault();
    }),
    isClickingRef = o.useRef(!1),
    handleClick = E(() => {
      var tabElement;
      isClickingRef.current ||
        ((isClickingRef.current = !0),
        (tabElement = elementRef.current) == null ||
          tabElement.focus({
            preventScroll: !0,
          }),
        tabsActions.change(tabIndex),
        ve(() => {
          isClickingRef.current = !1;
        }));
    }),
    handleMouseDown = E((mouseEvent) => {
      mouseEvent.preventDefault();
    }),
    { isFocusVisible: isFocusVisible, focusProps: focusProps } = Z({
      autoFocus: autoFocus,
    }),
    { isHovered: isHovered, hoverProps: hoverProps } = fe({
      isDisabled: isDisabled,
    }),
    { pressed: isPressed, pressProps: pressProps } = pe({
      disabled: isDisabled,
    }),
    slotData = N({
      selected: isSelected,
      hover: isHovered,
      active: isPressed,
      focus: isFocusVisible,
      autofocus: autoFocus,
      disabled: isDisabled,
    }),
    ourProps = te(
      {
        ref: mergedRef,
        onKeyDown: handleKeyDown,
        onMouseDown: handleMouseDown,
        onClick: handleClick,
        id: tabId,
        role: "tab",
        type: be(props, resolvedElement),
        "aria-controls":
          (panelElement = (panelRef = allPanels[tabIndex]) == null ? void 0 : panelRef.current) == null ? void 0 : panelElement.id,
        "aria-selected": isSelected,
        tabIndex: isSelected ? 0 : -1,
        disabled: isDisabled || void 0,
        autoFocus: autoFocus,
      },
      focusProps,
      hoverProps,
      pressProps,
    );
  return V()({
    ourProps: ourProps,
    theirProps: restProps,
    slot: slotData,
    defaultTag: ke,
    name: "Tabs.Tab",
  });
}

/* ---- Tab.Panels Component ---- */
let Re = "div";
function Le(props, ref) {
  let { selectedIndex: selectedIndex } = k("Tab.Panels"),
    mergedRef = W(ref),
    slotData = N({
      selectedIndex: selectedIndex,
    }),
    theirProps = props,
    ourProps = {
      ref: mergedRef,
    };
  return V()({
    ourProps: ourProps,
    theirProps: theirProps,
    slot: slotData,
    defaultTag: Re,
    name: "Tabs.Panels",
  });
}

/* ---- Tab.Panel Component ---- */
let Me = "div",
  Oe = Q.RenderStrategy | Q.Static;
function Be(props, ref) {
  var tabRef, tabElement, unmountProp, staticProp;
  let generatedId = o.useId(),
    { id: panelId = `headlessui-tabs-panel-${generatedId}`, tabIndex: tabIndexProp = 0, ...restProps } = props,
    { selectedIndex: selectedIndex, tabs: allTabs, panels: allPanels } = k("Tab.Panel"),
    panelActions = J("Tab.Panel"),
    elementRef = o.useRef(null),
    mergedRef = W(elementRef, ref);
  K(() => panelActions.registerPanel(elementRef), [panelActions, elementRef]);
  let stableIndex = ne("panels"),
    panelIndex = allPanels.indexOf(elementRef);
  if (panelIndex === -1) {
    panelIndex = stableIndex;
  }
  let isSelected = panelIndex === selectedIndex,
    { isFocusVisible: isFocusVisible, focusProps: focusProps } = Z(),
    slotData = N({
      selected: isSelected,
      focus: isFocusVisible,
    }),
    ourProps = te(
      {
        ref: mergedRef,
        id: panelId,
        role: "tabpanel",
        "aria-labelledby":
          (tabElement = (tabRef = allTabs[panelIndex]) == null ? void 0 : tabRef.current) == null ? void 0 : tabElement.id,
        tabIndex: isSelected ? tabIndexProp : -1,
      },
      focusProps,
    ),
    render = V();
  return !isSelected && ((unmountProp = restProps.unmount) == null || unmountProp) && !((staticProp = restProps.static) != null && staticProp)
    ? F.createElement(ee, {
        "aria-hidden": "true",
        ...ourProps,
      })
    : render({
        ourProps: ourProps,
        theirProps: restProps,
        slot: slotData,
        defaultTag: Me,
        features: Oe,
        visible: isSelected,
        name: "Tabs.Panel",
      });
}

/* ---- Forward Ref Wrappers ---- */
let Ge = U(De),
  Ue = U(Ae),
  We = U(Fe),
  Ne = U(Le),
  Ve = U(Be),

/* ---- Composed Tab Export ---- */
  _e = Object.assign(Ge, {
    Group: Ue,
    List: We,
    Panels: Ne,
    Panel: Ve,
  });
export { Ue as B, Ve as K, We as W, _e as d, Ne as j };
