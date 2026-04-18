/* ========================================
 * Icon Base (react-icons utility)
 * Shared infrastructure for rendering SVG icons via react-icons.
 * Provides GenIcon factory, IconContext, and the base IconBase component.
 * ======================================== */
import { R as a } from "./index-Bx06KCE-.js";
var defaultIconContext = {
    color: void 0,
    size: void 0,
    className: void 0,
    style: void 0,
    attr: void 0,
  },
  f = a.createContext && a.createContext(defaultIconContext),
  O = ["attr", "size", "title"];
function objectWithoutPropertiesFull(source, excluded) {
  if (source == null) return {};
  var result = objectWithoutPropertiesLoose(source, excluded),
    key,
    index;
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(source);
    for (index = 0; index < symbols.length; index++) {
      key = symbols[index];
      if (
        !(excluded.indexOf(key) >= 0) &&
        Object.prototype.propertyIsEnumerable.call(source, key)
      ) {
        result[key] = source[key];
      }
    }
  }
  return result;
}
function objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var result = {};
  for (var key in source)
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (excluded.indexOf(key) >= 0) continue;
      result[key] = source[key];
    }
  return result;
}
function objectAssign() {
  return (
    (objectAssign = Object.assign
      ? Object.assign.bind()
      : function (target) {
          for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
            var source = arguments[argIndex];
            for (var key in source)
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
          }
          return target;
        }),
    objectAssign.apply(this, arguments)
  );
}
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function (item) {
        return Object.getOwnPropertyDescriptor(object, item).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}
function objectSpread(target) {
  for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
    var source = arguments[argIndex] != null ? arguments[argIndex] : {};
    argIndex % 2
      ? ownKeys(Object(source), !0).forEach(function (item) {
          defineProperty(target, item, source[item]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source))
        : ownKeys(Object(source)).forEach(function (item) {
            Object.defineProperty(
              target,
              item,
              Object.getOwnPropertyDescriptor(source, item),
            );
          });
  }
  return target;
}
function defineProperty(object, key, value) {
  return (
    (key = toPropKey(key)),
    key in object
      ? Object.defineProperty(object, key, {
          value: value,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (object[key] = value),
    object
  );
}
function toPropKey(input) {
  var converted = toPrimitive(input, "string");
  return typeof converted == "symbol" ? converted : converted + "";
}
function toPrimitive(input, hint) {
  if (typeof input != "object" || !input) return input;
  var toPrimitiveFn = input[Symbol.toPrimitive];
  if (toPrimitiveFn !== void 0) {
    var result = toPrimitiveFn.call(input, hint);
    if (typeof result != "object") return result;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function renderChildElements(childTree) {
  return (
    childTree &&
    childTree.map((item, index) =>
      a.createElement(
        item.tag,
        objectSpread(
          {
            key: index,
          },
          item.attr,
        ),
        renderChildElements(item.child),
      ),
    )
  );
}
function GenIcon(iconData) {
  return (props) =>
    a.createElement(
      IconBase,
      objectAssign(
        {
          attr: objectSpread({}, iconData.attr),
        },
        props,
      ),
      renderChildElements(iconData.child),
    );
}
function IconBase(props) {
  var renderSvg = (contextProps) => {
    var { attr: contextAttr, size: contextSize, title: titleText } = contextProps,
      remainingContextProps = objectWithoutPropertiesFull(contextProps, O),
      computedSize = contextSize || props.size || "1em",
      combinedClassName;
    return (
      props.className && (combinedClassName = props.className),
      props.className && (combinedClassName = (combinedClassName ? combinedClassName + " " : "") + props.className),
      a.createElement(
        "svg",
        objectAssign(
          {
            stroke: "currentColor",
            fill: "currentColor",
            strokeWidth: "0",
          },
          props.attr,
          contextAttr,
          remainingContextProps,
          {
            className: combinedClassName,
            style: objectSpread(
              objectSpread(
                {
                  color: props.color || props.color,
                },
                props.style,
              ),
              props.style,
            ),
            height: computedSize,
            width: computedSize,
            xmlns: "http://www.w3.org/2000/svg",
          },
        ),
        titleText && a.createElement("title", null, titleText),
        props.children,
      )
    );
  };
  return f !== void 0 ? a.createElement(f.Consumer, null, (contextValue) => renderSvg(contextValue)) : renderSvg(defaultIconContext);
}
export { GenIcon as G };
