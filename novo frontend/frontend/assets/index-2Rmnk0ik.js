/* ============================================================
 *  Monitoring Page – New Listings Dashboard
 *  Real-time crypto exchange listing tracker with countdown
 *  timers, alert sounds, and WebSocket live updates.
 * ============================================================ */

/* -------------------------------------------------------
 *  External Imports (DO NOT MODIFY)
 * ------------------------------------------------------- */
import {
  a as s,
  o as Be,
  g as Ce,
  h as gt,
  p as _,
  n as Pe,
  j as e,
  B as Z,
  I as X,
  T as Ke,
  q as pt,
  k as _e,
  s as kt,
  S as V,
  t as yt,
} from "./index-Bx06KCE-.js";
import { u as vt, P as bt } from "./Page-hVEPjFz_.js";
import { b as je } from "./exchange-BNVQP8m4.js";
import {
  D as ge,
  l as jt,
  s as Nt,
  F as wt,
} from "./userPreferences-DJ2q-do7.js";
import { F as $t, a as St } from "./TrashIcon-DZPNpgRn.js";
import { F as Mt } from "./Cog6ToothIcon-EOZD7MO5.js";
import { F as Dt } from "./ChevronLeftIcon-UrS6hBlQ.js";
import { F as Et } from "./ChevronRightIcon-EvEZ5GcB.js";
import { F as Ee } from "./ClockIcon-c5Zk21LG.js";
import { F as xe } from "./XMarkIcon-mqVC0SZA.js";
import { K as Ne, O as ee } from "./transition-Cxix63ts.js";
import { h as we, z as $e, Q as Se } from "./dialog-DOjFQwF9.js";
import "./use-is-mounted-D7iMJT5-.js";

/* -------------------------------------------------------
 *  Custom Hooks – Debounce utilities
 * ------------------------------------------------------- */

/**
 * useDebouncedCallback – wraps a callback with lodash-style debounce,
 * automatically cancelling on unmount.
 */
function useDebouncedCallback(callback, delayMs = 500, options) {
  const pendingRef = s.useRef(null);
  vt(() => {
    if (pendingRef.current) {
      pendingRef.current.cancel();
    }
  });
  const debouncedFn = s.useMemo(() => {
    const debounced = Be(callback, delayMs, options),
      wrapper = (...args) => debounced(...args);
    return (
      (wrapper.cancel = () => {
        debounced.cancel();
      }),
      (wrapper.isPending = () => !!pendingRef.current),
      (wrapper.flush = () => debounced.flush()),
      wrapper
    );
  }, [callback, delayMs, options]);
  return (
    s.useEffect(() => {
      pendingRef.current = Be(callback, delayMs, options);
    }, [callback, delayMs, options]),
    debouncedFn
  );
}

/**
 * useDebouncedState – returns a debounced version of a reactive value.
 */
function useDebouncedState(initialValueOrFactory, delayMs, options) {
  const isEqual = (valueA, valueB) => valueA === valueB,
    resolvedInitial =
      initialValueOrFactory instanceof Function
        ? initialValueOrFactory()
        : initialValueOrFactory,
    [debouncedValue, setDebouncedValue] = s.useState(resolvedInitial),
    previousValueRef = s.useRef(resolvedInitial),
    debouncedSetter = useDebouncedCallback(setDebouncedValue, delayMs, options);
  return (
    isEqual(previousValueRef.current, resolvedInitial) ||
      (debouncedSetter(resolvedInitial),
      (previousValueRef.current = resolvedInitial)),
    [debouncedValue, debouncedSetter]
  );
}

/* -------------------------------------------------------
 *  SVG Icon Components
 * ------------------------------------------------------- */

/** ShieldExclamationIcon – outline style warning shield */
function ShieldExclamationIconRender(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return s.createElement(
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
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? s.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    s.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z",
    }),
  );
}
const ShieldExclamationIcon = s.forwardRef(ShieldExclamationIconRender);

/** BellAlertIcon – filled bell for active notification */
function BellAlertIconRender(
  { title: titleText, titleId: titleElementId, ...restProps },
  ref,
) {
  return s.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": titleElementId,
      },
      restProps,
    ),
    titleText
      ? s.createElement(
          "title",
          {
            id: titleElementId,
          },
          titleText,
        )
      : null,
    s.createElement("path", {
      fillRule: "evenodd",
      d: "M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z",
      clipRule: "evenodd",
    }),
  );
}
const BellAlertIcon = s.forwardRef(BellAlertIconRender);

/* -------------------------------------------------------
 *  Day.js Plugins – Duration, UTC, Timezone
 * ------------------------------------------------------- */

var durationModule = {
    exports: {},
  },
  durationModuleContext = durationModule.exports,
  durationPluginLoaded;
function requireDuration() {
  return (
    durationPluginLoaded ||
      ((durationPluginLoaded = 1),
      (function (moduleWrapper, moduleExports) {
        (function (context, factory) {
          moduleWrapper.exports = factory();
        })(durationModuleContext, function () {
          var dayjsFactory,
            dayjsUtils,
            MILLISECONDS_A_SECOND = 1e3,
            MILLISECONDS_A_MINUTE = 6e4,
            MILLISECONDS_A_HOUR = 36e5,
            MILLISECONDS_A_DAY = 864e5,
            FORMAT_REGEX =
              /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,
            MILLISECONDS_A_YEAR = 31536e6,
            MILLISECONDS_A_MONTH = 2628e6,
            ISO_DURATION_REGEX =
              /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,
            UNIT_TO_MS = {
              years: MILLISECONDS_A_YEAR,
              months: MILLISECONDS_A_MONTH,
              days: MILLISECONDS_A_DAY,
              hours: MILLISECONDS_A_HOUR,
              minutes: MILLISECONDS_A_MINUTE,
              seconds: MILLISECONDS_A_SECOND,
              milliseconds: 1,
              weeks: 6048e5,
            },
            isDuration = function (val) {
              return val instanceof Duration;
            },
            createDuration = function (input, instance, locale) {
              return new Duration(input, locale, instance.$l);
            },
            pluralize = function (unitName) {
              return dayjsUtils.p(unitName) + "s";
            },
            isNegative = function (num) {
              return num < 0;
            },
            roundTowardZero = function (num) {
              return isNegative(num) ? Math.ceil(num) : Math.floor(num);
            },
            absoluteValue = function (num) {
              return Math.abs(num);
            },
            formatPart = function (value, unit) {
              return value
                ? isNegative(value)
                  ? {
                      negative: true,
                      format: "" + absoluteValue(value) + unit,
                    }
                  : {
                      negative: false,
                      format: "" + value + unit,
                    }
                : {
                    negative: false,
                    format: "",
                  };
            },
            Duration = (function () {
              function DurationConstructor(input, unitOrLocale, locale) {
                var self = this;
                if (
                  ((this.$d = {}),
                  (this.$l = locale),
                  input === undefined &&
                    ((this.$ms = 0), this.parseFromMilliseconds()),
                  unitOrLocale)
                )
                  return createDuration(
                    input * UNIT_TO_MS[pluralize(unitOrLocale)],
                    this,
                  );
                if (typeof input == "number")
                  return (
                    (this.$ms = input),
                    this.parseFromMilliseconds(),
                    this
                  );
                if (typeof input == "object")
                  return (
                    Object.keys(input).forEach(function (item) {
                      self.$d[pluralize(item)] = input[item];
                    }),
                    this.calMilliseconds(),
                    this
                  );
                if (typeof input == "string") {
                  var parsedMatch = input.match(ISO_DURATION_REGEX);
                  if (parsedMatch) {
                    var parsedValues = parsedMatch
                      .slice(2)
                      .map(function (item) {
                        return item != null ? Number(item) : 0;
                      });
                    return (
                      (this.$d.years = parsedValues[0]),
                      (this.$d.months = parsedValues[1]),
                      (this.$d.weeks = parsedValues[2]),
                      (this.$d.days = parsedValues[3]),
                      (this.$d.hours = parsedValues[4]),
                      (this.$d.minutes = parsedValues[5]),
                      (this.$d.seconds = parsedValues[6]),
                      this.calMilliseconds(),
                      this
                    );
                  }
                }
                return this;
              }
              var proto = DurationConstructor.prototype;
              return (
                (proto.calMilliseconds = function () {
                  var self = this;
                  this.$ms = Object.keys(this.$d).reduce(function (
                    totalMs,
                    unitKey,
                  ) {
                    return (
                      totalMs + (self.$d[unitKey] || 0) * UNIT_TO_MS[unitKey]
                    );
                  }, 0);
                }),
                (proto.parseFromMilliseconds = function () {
                  var remainingMs = this.$ms;
                  this.$d.years = roundTowardZero(
                    remainingMs / MILLISECONDS_A_YEAR,
                  );
                  remainingMs %= MILLISECONDS_A_YEAR;
                  this.$d.months = roundTowardZero(
                    remainingMs / MILLISECONDS_A_MONTH,
                  );
                  remainingMs %= MILLISECONDS_A_MONTH;
                  this.$d.days = roundTowardZero(
                    remainingMs / MILLISECONDS_A_DAY,
                  );
                  remainingMs %= MILLISECONDS_A_DAY;
                  this.$d.hours = roundTowardZero(
                    remainingMs / MILLISECONDS_A_HOUR,
                  );
                  remainingMs %= MILLISECONDS_A_HOUR;
                  this.$d.minutes = roundTowardZero(
                    remainingMs / MILLISECONDS_A_MINUTE,
                  );
                  remainingMs %= MILLISECONDS_A_MINUTE;
                  this.$d.seconds = roundTowardZero(
                    remainingMs / MILLISECONDS_A_SECOND,
                  );
                  remainingMs %= MILLISECONDS_A_SECOND;
                  this.$d.milliseconds = remainingMs;
                }),
                (proto.toISOString = function () {
                  var yearsPart = formatPart(this.$d.years, "Y"),
                    monthsPart = formatPart(this.$d.months, "M"),
                    totalDays = +this.$d.days || 0;
                  if (this.$d.weeks) {
                    totalDays += 7 * this.$d.weeks;
                  }
                  var daysPart = formatPart(totalDays, "D"),
                    hoursPart = formatPart(this.$d.hours, "H"),
                    minutesPart = formatPart(this.$d.minutes, "M"),
                    totalSeconds = this.$d.seconds || 0;
                  if (this.$d.milliseconds) {
                    ((totalSeconds += this.$d.milliseconds / 1e3),
                      (totalSeconds = Math.round(1e3 * totalSeconds) / 1e3));
                  }
                  var secondsPart = formatPart(totalSeconds, "S"),
                    hasNegative =
                      yearsPart.negative ||
                      monthsPart.negative ||
                      daysPart.negative ||
                      hoursPart.negative ||
                      minutesPart.negative ||
                      secondsPart.negative,
                    timeSeparator =
                      hoursPart.format ||
                      minutesPart.format ||
                      secondsPart.format
                        ? "T"
                        : "",
                    isoString =
                      (hasNegative ? "-" : "") +
                      "P" +
                      yearsPart.format +
                      monthsPart.format +
                      daysPart.format +
                      timeSeparator +
                      hoursPart.format +
                      minutesPart.format +
                      secondsPart.format;
                  return isoString === "P" || isoString === "-P"
                    ? "P0D"
                    : isoString;
                }),
                (proto.toJSON = function () {
                  return this.toISOString();
                }),
                (proto.format = function (formatStr) {
                  var template = formatStr || "YYYY-MM-DDTHH:mm:ss",
                    formatTokens = {
                      Y: this.$d.years,
                      YY: dayjsUtils.s(this.$d.years, 2, "0"),
                      YYYY: dayjsUtils.s(this.$d.years, 4, "0"),
                      M: this.$d.months,
                      MM: dayjsUtils.s(this.$d.months, 2, "0"),
                      D: this.$d.days,
                      DD: dayjsUtils.s(this.$d.days, 2, "0"),
                      H: this.$d.hours,
                      HH: dayjsUtils.s(this.$d.hours, 2, "0"),
                      m: this.$d.minutes,
                      mm: dayjsUtils.s(this.$d.minutes, 2, "0"),
                      s: this.$d.seconds,
                      ss: dayjsUtils.s(this.$d.seconds, 2, "0"),
                      SSS: dayjsUtils.s(this.$d.milliseconds, 3, "0"),
                    };
                  return template.replace(
                    FORMAT_REGEX,
                    function (match, escaped) {
                      return escaped || String(formatTokens[match]);
                    },
                  );
                }),
                (proto.as = function (unit) {
                  return this.$ms / UNIT_TO_MS[pluralize(unit)];
                }),
                (proto.get = function (unit) {
                  var ms = this.$ms,
                    normalizedUnit = pluralize(unit);
                  return (
                    normalizedUnit === "milliseconds"
                      ? (ms %= 1e3)
                      : (ms =
                          normalizedUnit === "weeks"
                            ? roundTowardZero(ms / UNIT_TO_MS[normalizedUnit])
                            : this.$d[normalizedUnit]),
                    ms || 0
                  );
                }),
                (proto.add = function (input, unit, isSubtract) {
                  var addedMs;
                  return (
                    (addedMs = unit
                      ? input * UNIT_TO_MS[pluralize(unit)]
                      : isDuration(input)
                        ? input.$ms
                        : createDuration(input, this).$ms),
                    createDuration(
                      this.$ms + addedMs * (isSubtract ? -1 : 1),
                      this,
                    )
                  );
                }),
                (proto.subtract = function (input, unit) {
                  return this.add(input, unit, true);
                }),
                (proto.locale = function (localeName) {
                  var cloned = this.clone();
                  return ((cloned.$l = localeName), cloned);
                }),
                (proto.clone = function () {
                  return createDuration(this.$ms, this);
                }),
                (proto.humanize = function (withSuffix) {
                  return dayjsFactory()
                    .add(this.$ms, "ms")
                    .locale(this.$l)
                    .fromNow(!withSuffix);
                }),
                (proto.valueOf = function () {
                  return this.asMilliseconds();
                }),
                (proto.milliseconds = function () {
                  return this.get("milliseconds");
                }),
                (proto.asMilliseconds = function () {
                  return this.as("milliseconds");
                }),
                (proto.seconds = function () {
                  return this.get("seconds");
                }),
                (proto.asSeconds = function () {
                  return this.as("seconds");
                }),
                (proto.minutes = function () {
                  return this.get("minutes");
                }),
                (proto.asMinutes = function () {
                  return this.as("minutes");
                }),
                (proto.hours = function () {
                  return this.get("hours");
                }),
                (proto.asHours = function () {
                  return this.as("hours");
                }),
                (proto.days = function () {
                  return this.get("days");
                }),
                (proto.asDays = function () {
                  return this.as("days");
                }),
                (proto.weeks = function () {
                  return this.get("weeks");
                }),
                (proto.asWeeks = function () {
                  return this.as("weeks");
                }),
                (proto.months = function () {
                  return this.get("months");
                }),
                (proto.asMonths = function () {
                  return this.as("months");
                }),
                (proto.years = function () {
                  return this.get("years");
                }),
                (proto.asYears = function () {
                  return this.as("years");
                }),
                DurationConstructor
              );
            })(),
            addDurationToDate = function (date, duration, sign) {
              return date
                .add(duration.years() * sign, "y")
                .add(duration.months() * sign, "M")
                .add(duration.days() * sign, "d")
                .add(duration.hours() * sign, "h")
                .add(duration.minutes() * sign, "m")
                .add(duration.seconds() * sign, "s")
                .add(duration.milliseconds() * sign, "ms");
            };
          return function (optionName, DayjsClass, dayjsFactoryFn) {
            dayjsFactory = dayjsFactoryFn;
            dayjsUtils = dayjsFactoryFn().$utils();
            dayjsFactoryFn.duration = function (input, unit) {
              var currentLocale = dayjsFactoryFn.locale();
              return createDuration(
                input,
                {
                  $l: currentLocale,
                },
                unit,
              );
            };
            dayjsFactoryFn.isDuration = isDuration;
            var originalAdd = DayjsClass.prototype.add,
              originalSubtract = DayjsClass.prototype.subtract;
            DayjsClass.prototype.add = function (input, unit) {
              return isDuration(input)
                ? addDurationToDate(this, input, 1)
                : originalAdd.bind(this)(input, unit);
            };
            DayjsClass.prototype.subtract = function (input, unit) {
              return isDuration(input)
                ? addDurationToDate(this, input, -1)
                : originalSubtract.bind(this)(input, unit);
            };
          };
        });
      })(durationModule)),
    durationModule.exports
  );
}
var durationPluginRaw = requireDuration();
const dayjsDuration = Ce(durationPluginRaw);

var utcModule = {
    exports: {},
  },
  utcModuleContext = utcModule.exports,
  utcPluginLoaded;
function requireUtc() {
  return (
    utcPluginLoaded ||
      ((utcPluginLoaded = 1),
      (function (moduleWrapper, moduleExports) {
        (function (context, factory) {
          moduleWrapper.exports = factory();
        })(utcModuleContext, function () {
          var MINUTE_UNIT = "minute",
            OFFSET_REGEX = /[+-]\d\d(?::?\d\d)?/g,
            OFFSET_PARTS_REGEX = /([+-]|\d\d)/g;
          return function (optionName, DayjsClass, dayjsFactory) {
            var proto = DayjsClass.prototype;
            dayjsFactory.utc = function (dateInput) {
              var config = {
                date: dateInput,
                utc: true,
                args: arguments,
              };
              return new DayjsClass(config);
            };
            proto.utc = function (keepLocalTime) {
              var utcInstance = dayjsFactory(this.toDate(), {
                locale: this.$L,
                utc: true,
              });
              return keepLocalTime
                ? utcInstance.add(this.utcOffset(), MINUTE_UNIT)
                : utcInstance;
            };
            proto.local = function () {
              return dayjsFactory(this.toDate(), {
                locale: this.$L,
                utc: false,
              });
            };
            var originalParse = proto.parse;
            proto.parse = function (config) {
              if (config.utc) {
                this.$u = true;
              }
              this.$utils().u(config.$offset) ||
                (this.$offset = config.$offset);
              originalParse.call(this, config);
            };
            var originalInit = proto.init;
            proto.init = function () {
              if (this.$u) {
                var dateObj = this.$d;
                this.$y = dateObj.getUTCFullYear();
                this.$M = dateObj.getUTCMonth();
                this.$D = dateObj.getUTCDate();
                this.$W = dateObj.getUTCDay();
                this.$H = dateObj.getUTCHours();
                this.$m = dateObj.getUTCMinutes();
                this.$s = dateObj.getUTCSeconds();
                this.$ms = dateObj.getUTCMilliseconds();
              } else originalInit.call(this);
            };
            var originalUtcOffset = proto.utcOffset;
            proto.utcOffset = function (input, keepLocalTime) {
              var isUndefined = this.$utils().u;
              if (isUndefined(input)) {
                if (this.$u) {
                  return 0;
                }
                if (isUndefined(this.$offset)) {
                  return originalUtcOffset.call(this);
                }
                return this.$offset;
              }
              if (
                typeof input == "string" &&
                ((input = (function (offsetStr) {
                  if (offsetStr === undefined) {
                    offsetStr = "";
                  }
                  var matched = offsetStr.match(OFFSET_REGEX);
                  if (!matched) return null;
                  var parts = ("" + matched[0]).match(OFFSET_PARTS_REGEX) || [
                      "-",
                      0,
                      0,
                    ],
                    sign = parts[0],
                    totalMinutes = 60 * +parts[1] + +parts[2];
                  if (totalMinutes === 0) {
                    return 0;
                  }
                  if (sign === "+") {
                    return totalMinutes;
                  }
                  return -totalMinutes;
                })(input)),
                input === null)
              )
                return this;
              var offsetMinutes = Math.abs(input) <= 16 ? 60 * input : input;
              if (offsetMinutes === 0) return this.utc(keepLocalTime);
              var cloned = this.clone();
              if (keepLocalTime)
                return (
                  (cloned.$offset = offsetMinutes),
                  (cloned.$u = false),
                  cloned
                );
              var localTimezoneOffset = this.$u
                ? this.toDate().getTimezoneOffset()
                : -1 * this.utcOffset();
              return (
                ((cloned = this.local().add(
                  offsetMinutes + localTimezoneOffset,
                  MINUTE_UNIT,
                )).$offset = offsetMinutes),
                (cloned.$x.$localOffset = localTimezoneOffset),
                cloned
              );
            };
            var originalFormat = proto.format;
            proto.format = function (formatStr) {
              var template =
                formatStr || (this.$u ? "YYYY-MM-DDTHH:mm:ss[Z]" : "");
              return originalFormat.call(this, template);
            };
            proto.valueOf = function () {
              var offsetDelta = this.$utils().u(this.$offset)
                ? 0
                : this.$offset +
                  (this.$x.$localOffset || this.$d.getTimezoneOffset());
              return this.$d.valueOf() - 6e4 * offsetDelta;
            };
            proto.isUTC = function () {
              return !!this.$u;
            };
            proto.toISOString = function () {
              return this.toDate().toISOString();
            };
            proto.toString = function () {
              return this.toDate().toUTCString();
            };
            var originalToDate = proto.toDate;
            proto.toDate = function (type) {
              return type === "s" && this.$offset
                ? dayjsFactory(this.format("YYYY-MM-DD HH:mm:ss:SSS")).toDate()
                : originalToDate.call(this);
            };
            var originalDiff = proto.diff;
            proto.diff = function (otherDate, unit, asFloat) {
              if (otherDate && this.$u === otherDate.$u)
                return originalDiff.call(this, otherDate, unit, asFloat);
              var localThis = this.local(),
                localOther = dayjsFactory(otherDate).local();
              return originalDiff.call(localThis, localOther, unit, asFloat);
            };
          };
        });
      })(utcModule)),
    utcModule.exports
  );
}
var utcPluginRaw = requireUtc();
const dayjsUtc = Ce(utcPluginRaw);

var timezoneModule = {
    exports: {},
  },
  timezoneModuleContext = timezoneModule.exports,
  timezonePluginLoaded;
function requireTimezone() {
  return (
    timezonePluginLoaded ||
      ((timezonePluginLoaded = 1),
      (function (moduleWrapper, moduleExports) {
        (function (context, factory) {
          moduleWrapper.exports = factory();
        })(timezoneModuleContext, function () {
          var DATE_PART_INDICES = {
              year: 0,
              month: 1,
              day: 2,
              hour: 3,
              minute: 4,
              second: 5,
            },
            formatterCache = {};
          return function (optionName, DayjsClass, dayjsFactory) {
            var defaultTimezone,
              formatDateToParts = function (timestamp, timezone, options) {
                if (options === undefined) {
                  options = {};
                }
                var dateObj = new Date(timestamp),
                  formatter = (function (timezoneId, formatOpts) {
                    if (formatOpts === undefined) {
                      formatOpts = {};
                    }
                    var timeZoneName = formatOpts.timeZoneName || "short",
                      cacheKey = timezoneId + "|" + timeZoneName,
                      cached = formatterCache[cacheKey];
                    return (
                      cached ||
                        ((cached = new Intl.DateTimeFormat("en-US", {
                          hour12: false,
                          timeZone: timezoneId,
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZoneName: timeZoneName,
                        })),
                        (formatterCache[cacheKey] = cached)),
                      cached
                    );
                  })(timezone, options);
                return formatter.formatToParts(dateObj);
              },
              calculateOffset = function (timestampMs, timezone) {
                for (
                  var parts = formatDateToParts(timestampMs, timezone),
                    dateParts = [],
                    idx = 0;
                  idx < parts.length;
                  idx += 1
                ) {
                  var part = parts[idx],
                    partType = part.type,
                    partValue = part.value,
                    partIndex = DATE_PART_INDICES[partType];
                  if (partIndex >= 0) {
                    dateParts[partIndex] = parseInt(partValue, 10);
                  }
                }
                var hours = dateParts[3],
                  normalizedHours = hours === 24 ? 0 : hours,
                  dateString =
                    dateParts[0] +
                    "-" +
                    dateParts[1] +
                    "-" +
                    dateParts[2] +
                    " " +
                    normalizedHours +
                    ":" +
                    dateParts[4] +
                    ":" +
                    dateParts[5] +
                    ":000",
                  timestampTruncated = +timestampMs;
                return (
                  (dayjsFactory.utc(dateString).valueOf() -
                    (timestampTruncated -= timestampTruncated % 1e3)) /
                  6e4
                );
              },
              dayjsProto = DayjsClass.prototype;
            dayjsProto.tz = function (timezone, keepLocalTime) {
              if (timezone === undefined) {
                timezone = defaultTimezone;
              }
              var result,
                currentOffset = this.utcOffset(),
                dateObj = this.toDate(),
                localeDateStr = dateObj.toLocaleString("en-US", {
                  timeZone: timezone,
                }),
                diffMinutes = Math.round(
                  (dateObj - new Date(localeDateStr)) / 1e3 / 60,
                ),
                targetOffset =
                  15 * -Math.round(dateObj.getTimezoneOffset() / 15) -
                  diffMinutes;
              if (!Number(targetOffset))
                result = this.utcOffset(0, keepLocalTime);
              else if (
                ((result = dayjsFactory(localeDateStr, {
                  locale: this.$L,
                })
                  .$set("millisecond", this.$ms)
                  .utcOffset(targetOffset, true)),
                keepLocalTime)
              ) {
                var resultOffset = result.utcOffset();
                result = result.add(currentOffset - resultOffset, "minute");
              }
              return ((result.$x.$timezone = timezone), result);
            };
            dayjsProto.offsetName = function (type) {
              var timezone = this.$x.$timezone || dayjsFactory.tz.guess(),
                found = formatDateToParts(this.valueOf(), timezone, {
                  timeZoneName: type,
                }).find(function (props) {
                  return props.type.toLowerCase() === "timezonename";
                });
              return found && found.value;
            };
            var originalStartOf = dayjsProto.startOf;
            dayjsProto.startOf = function (unit, keepLocalTime) {
              if (!this.$x || !this.$x.$timezone)
                return originalStartOf.call(this, unit, keepLocalTime);
              var localInstance = dayjsFactory(
                this.format("YYYY-MM-DD HH:mm:ss:SSS"),
                {
                  locale: this.$L,
                },
              );
              return originalStartOf
                .call(localInstance, unit, keepLocalTime)
                .tz(this.$x.$timezone, true);
            };
            dayjsFactory.tz = function (
              dateInput,
              formatOrTimezone,
              timezoneArg,
            ) {
              var formatStr = timezoneArg && formatOrTimezone,
                timezone = timezoneArg || formatOrTimezone || defaultTimezone,
                baseOffset = calculateOffset(+dayjsFactory(), timezone);
              if (typeof dateInput != "string")
                return dayjsFactory(dateInput).tz(timezone);
              var resolved = (function (timestamp, offset, timezoneId) {
                  var adjusted = timestamp - 60 * offset * 1e3,
                    newOffset = calculateOffset(adjusted, timezoneId);
                  if (offset === newOffset) return [adjusted, offset];
                  var readjusted = adjusted - 60 * (newOffset - offset) * 1e3,
                    finalOffset = calculateOffset(readjusted, timezoneId);
                  return newOffset === finalOffset
                    ? [readjusted, newOffset]
                    : [
                        timestamp - 60 * Math.min(newOffset, finalOffset) * 1e3,
                        Math.max(newOffset, finalOffset),
                      ];
                })(
                  dayjsFactory.utc(dateInput, formatStr).valueOf(),
                  baseOffset,
                  timezone,
                ),
                resolvedTimestamp = resolved[0],
                resolvedOffset = resolved[1],
                result =
                  dayjsFactory(resolvedTimestamp).utcOffset(resolvedOffset);
              return ((result.$x.$timezone = timezone), result);
            };
            dayjsFactory.tz.guess = function () {
              return Intl.DateTimeFormat().resolvedOptions().timeZone;
            };
            dayjsFactory.tz.setDefault = function (tz) {
              defaultTimezone = tz;
            };
          };
        });
      })(timezoneModule)),
    timezoneModule.exports
  );
}
var timezonePluginRaw = requireTimezone();
const dayjsTimezone = Ce(timezonePluginRaw);

/* -------------------------------------------------------
 *  Day.js Plugin Registration
 * ------------------------------------------------------- */
_.extend(dayjsDuration);
_.extend(yt);
_.extend(dayjsUtc);
_.extend(dayjsTimezone);

/* -------------------------------------------------------
 *  Application Constants
 * ------------------------------------------------------- */
const DAYS_PER_PAGE = 7,
  MARKET_OPTIONS = [
    {
      value: "spot",
      label: "Spot",
    },
    {
      value: "future",
      label: "Future",
    },
  ],
  DEFAULT_LAUNCH_SETTINGS = {
    notifyBeforeMinutes: ge.launches.notifyBeforeMinutes,
    notifyAfterMinutes: ge.launches.notifyAfterMinutes,
    autoWatchNew: ge.launches.autoWatchNew,
  },
  API_BASE_URL = "http://localhost:8000",
  WS_BASE_URL = "ws://localhost:8000";

/* -------------------------------------------------------
 *  URL & Auth Helpers
 * ------------------------------------------------------- */

/** Ensures a WebSocket URL ends with /launches/ws */
const buildWsUrl = (url) => {
    return url.endsWith("/launches/ws")
      ? url
      : `${url.replace(/\/+$/, "")}/launches/ws`;
  },
  /** Derives the HTTP base URL from a WebSocket URL */
  deriveHttpUrlFromWs = (wsUrl) => {
    try {
      const fullWsUrl = buildWsUrl(wsUrl),
        urlObj = new URL(fullWsUrl);
      return (
        (urlObj.protocol = urlObj.protocol === "wss:" ? "https:" : "http:"),
        (urlObj.pathname = ""),
        (urlObj.search = ""),
        (urlObj.hash = ""),
        urlObj.toString().replace(/\/$/, "")
      );
    } catch (error) {
      return (
        console.warn("Nao foi possivel derivar URL HTTP a partir do WS", error),
        null
      );
    }
  },
  /** Retrieves the auth token from localStorage */
  getAuthToken = () => {
    return typeof window < "u" ? localStorage.getItem("authToken") : null;
  };

/* -------------------------------------------------------
 *  Date & Display Helpers
 * ------------------------------------------------------- */
const currentDate = _();

/** Parses a launch record into a Day.js object in Sao Paulo timezone */
const parseLaunchDate = (launch) =>
  _.tz(`${launch.date}T${launch.time || "00:00"}`, "America/Sao_Paulo");

/** Returns Tailwind CSS classes for an exchange badge based on exchange name */
const getExchangeBadgeClass = (exchangeName) => {
  if (!exchangeName) return "bg-gray-500 text-white";
  const lowerName = exchangeName.toLowerCase();
  if (lowerName.includes("binance")) {
    return "bg-[#F0B90B] text-black";
  }
  if (lowerName.includes("bybit")) {
    return "bg-gray-900 text-white dark:bg-white dark:text-black";
  }
  if (lowerName.includes("mexc")) {
    return "bg-[#2262F6] text-white";
  }
  if (lowerName.includes("gate")) {
    return "bg-[#0D857A] text-white";
  }
  if (lowerName.includes("kucoin")) {
    return "bg-[#24AE8F] text-white";
  }
  if (lowerName.includes("bitget")) {
    return "bg-[#03C0B5] text-white";
  }
  if (lowerName.includes("okx")) {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  return "bg-gray-500 text-white";
};

/* -------------------------------------------------------
 *  CountdownTimer Component
 *  Displays a live countdown to a launch date/time.
 * ------------------------------------------------------- */
function CountdownTimer({ targetDate: targetDateProp, launch: launchData }) {
  const [countdownText, setCountdownText] = s.useState(""),
    [hasLaunched, setHasLaunched] = s.useState(false);
  return (
    s.useEffect(() => {
      const calculateCountdown = () => {
        const now = _().tz("America/Sao_Paulo");
        let smallestDiffMs = 1 / 0,
          hasExchangeCountdown = false;
        if (launchData.exchanges && launchData.exchanges.length > 0) {
          launchData.exchanges.forEach((exchangeEntry) => {
            if (exchangeEntry.time) {
              const diffMs = _.tz(
                `${launchData.date}T${exchangeEntry.time}`,
                "America/Sao_Paulo",
              ).diff(now);
              if (diffMs > 0) {
                ((hasExchangeCountdown = true),
                  diffMs < smallestDiffMs && (smallestDiffMs = diffMs));
              }
            }
          });
        }
        const mainDiffMs = _.tz(
            `${launchData.date}T${launchData.time || "00:00"}`,
            "America/Sao_Paulo",
          ).diff(now),
          isDefaultTime = !launchData.time || launchData.time === "00:00";
        if (
          (mainDiffMs > 0 &&
            (!hasExchangeCountdown || !isDefaultTime) &&
            mainDiffMs < smallestDiffMs &&
            (smallestDiffMs = mainDiffMs),
          smallestDiffMs === 1 / 0 &&
            ((mainDiffMs <= 0 && !hasExchangeCountdown) || mainDiffMs <= 0))
        )
          return (setHasLaunched(true), "Já lançado");
        setHasLaunched(false);
        const duration = _.duration(smallestDiffMs),
          days = Math.floor(duration.asDays()),
          hours = duration.hours().toString().padStart(2, "0"),
          minutes = duration.minutes().toString().padStart(2, "0"),
          seconds = duration.seconds().toString().padStart(2, "0");
        return `${days}d ${hours}:${minutes}:${seconds}`;
      };
      setCountdownText(calculateCountdown());
      const intervalId = setInterval(() => {
        setCountdownText(calculateCountdown());
      }, 1e3);
      return () => clearInterval(intervalId);
    }, [targetDateProp, launchData]),
    e.jsxs(Ke, {
      variant: "soft",
      color: hasLaunched ? "success" : "warning",
      className: "gap-1 px-2 py-0.5 text-[10px] font-medium",
      children: [
        e.jsx(Ee, {
          className: "size-3",
        }),
        e.jsx("span", {
          children: countdownText,
        }),
      ],
    })
  );
}

/* -------------------------------------------------------
 *  LaunchCardSkeleton – Loading placeholder for cards
 * ------------------------------------------------------- */
const LaunchCardSkeleton = () =>
  e.jsxs("div", {
    className:
      "group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800",
    children: [
      e.jsxs("div", {
        className: "mb-4 flex items-start justify-between",
        children: [
          e.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              e.jsx(V, {
                className: "h-10 w-10 rounded-full",
              }),
              e.jsxs("div", {
                className: "space-y-2",
                children: [
                  e.jsx(V, {
                    className: "h-4 w-24",
                  }),
                  e.jsx(V, {
                    className: "h-3 w-12",
                  }),
                ],
              }),
            ],
          }),
          e.jsx(V, {
            className: "h-5 w-20 rounded-full",
          }),
        ],
      }),
      e.jsxs("div", {
        className: "space-y-3",
        children: [
          e.jsx(V, {
            className: "h-3 w-16",
          }),
          e.jsx(V, {
            className: "h-4 w-24",
          }),
          e.jsx(V, {
            className: "h-3 w-28",
          }),
          e.jsx(V, {
            className: "h-10 w-full rounded-lg",
          }),
        ],
      }),
    ],
  });

/* -------------------------------------------------------
 *  MonitoringPage – Main Page Component
 *  Dashboard for managing crypto exchange new listings
 *  with real-time WebSocket updates, countdown timers,
 *  and configurable alert notifications.
 * ------------------------------------------------------- */
function MonitoringPage() {
  /* --- Auth & Permissions --- */
  const { user: currentUser } = gt(),
    hasLaunchPermission = s.useMemo(
      () =>
        currentUser?.permissions?.includes("lancamentos") ||
        currentUser?.roles?.includes("lancamentos") ||
        currentUser?.roles?.includes("admin") ||
        false,
      [currentUser],
    ),
    /* --- API Base URL --- */
    httpBaseUrl = s.useMemo(() => deriveHttpUrlFromWs(WS_BASE_URL), []),
    /* --- Available Exchanges from catalog --- */
    [availableExchanges, setAvailableExchanges] = s.useState([]);

  s.useEffect(() => {
    (async () => {
      try {
        const authToken = getAuthToken(),
          { data: responseData } = await Pe.get(
            `${API_BASE_URL}/catalog/exchanges`,
            {
              headers: authToken
                ? {
                    Authorization: `Bearer ${authToken}`,
                  }
                : {},
            },
          );
        if (responseData.status === "ok" && Array.isArray(responseData.items)) {
          const activeExchangeNames = responseData.items
            .filter((exchangeItem) => exchangeItem.is_active)
            .map((exchangeItem) => exchangeItem.name);
          setAvailableExchanges(activeExchangeNames);
        }
      } catch (error) {
        console.error("Failed to fetch exchanges", error);
      }
    })();
  }, []);

  /* --- Calendar & Date Selection State --- */
  const [weekStartDate, setWeekStartDate] = s.useState(
      currentDate.startOf("day"),
    ),
    [selectedDate, setSelectedDate] = s.useState(
      currentDate.format("YYYY-MM-DD"),
    ),
    /* --- Launches Data --- */
    [launches, setLaunches] = s.useState([]),
    [isLoading, setIsLoading] = s.useState(true),
    currentMonth = s.useMemo(
      () => weekStartDate.format("YYYY-MM"),
      [weekStartDate],
    ),
    /* --- Search --- */
    [searchInputValue, setSearchInputValue] = s.useState(""),
    [debouncedSearch, setDebouncedSearch] = useDebouncedState("", 500),
    handleSearchChange = (event) => {
      const value = event.target.value;
      setSearchInputValue(value);
      setDebouncedSearch(value);
    },
    /* --- New Launch Form State --- */
    [newLaunchForm, setNewLaunchForm] = s.useState({
      coin: "",
    }),
    [formError, setFormError] = s.useState(null),
    [isNewLaunchModalOpen, setIsNewLaunchModalOpen] = s.useState(false),
    /* --- Exchange Editor State --- */
    [editingLaunchId, setEditingLaunchId] = s.useState(null),
    [exchangeForm, setExchangeForm] = s.useState({
      exchange: "",
      market: "spot",
      time: "07:00",
      link: "",
      notes: "",
    }),
    [exchangeFormError, setExchangeFormError] = s.useState(null),
    /* --- Toast / Error Banner --- */
    [toastError, setToastError] = s.useState(null),
    /* --- Notification Tracking --- */
    [lastNotifiedAt, setLastNotifiedAt] = s.useState({}),
    /* --- Watched Exchanges & Alert Settings --- */
    [watchedExchanges, setWatchedExchanges] = s.useState(
      ge.launches.watchedExchanges,
    ),
    [alertSettings, setAlertSettings] = s.useState(DEFAULT_LAUNCH_SETTINGS),
    alertSettingsRef = s.useRef(alertSettings);

  s.useEffect(() => {
    alertSettingsRef.current = alertSettings;
  }, [alertSettings]);

  /* Load user preferences on mount */
  s.useEffect(() => {
    let isMounted = true;
    return (
      (async () => {
        const prefs = await jt();
        if (isMounted) {
          (setAlertSettings({
            notifyBeforeMinutes: prefs.launches.notifyBeforeMinutes,
            notifyAfterMinutes: prefs.launches.notifyAfterMinutes,
            autoWatchNew: prefs.launches.autoWatchNew,
          }),
            setWatchedExchanges(prefs.launches.watchedExchanges));
        }
      })(),
      () => {
        isMounted = false;
      }
    );
  }, []);

  /* --- Save Alert Preferences --- */
  const saveAlertPreferences = s.useCallback(
      async (updates) => {
        const merged = {
          notifyBeforeMinutes:
            updates.notifyBeforeMinutes ?? alertSettings.notifyBeforeMinutes,
          notifyAfterMinutes:
            updates.notifyAfterMinutes ?? alertSettings.notifyAfterMinutes,
          autoWatchNew: updates.autoWatchNew ?? alertSettings.autoWatchNew,
          watchedExchanges: updates.watchedExchanges ?? watchedExchanges,
        };
        setAlertSettings({
          notifyBeforeMinutes: merged.notifyBeforeMinutes,
          notifyAfterMinutes: merged.notifyAfterMinutes,
          autoWatchNew: merged.autoWatchNew,
        });
        setWatchedExchanges(merged.watchedExchanges);
        try {
          await Nt({
            launches: merged,
          });
        } catch (error) {
          console.error("Erro ao salvar preferencias de lancamentos", error);
        }
      },
      [
        alertSettings.autoWatchNew,
        alertSettings.notifyAfterMinutes,
        alertSettings.notifyBeforeMinutes,
        watchedExchanges,
      ],
    ),
    /* --- Settings Modal --- */
    [isSettingsModalOpen, setIsSettingsModalOpen] = s.useState(false),
    /* --- WebSocket Refs --- */
    wsRef = s.useRef(null),
    reconnectTimerRef = s.useRef(null),
    /* --- Launch Data Normalizer --- */
    normalizeLaunch = s.useCallback(
      (launchRecord) => ({
        ...launchRecord,
        exchanges: Array.isArray(launchRecord?.exchanges)
          ? launchRecord.exchanges
          : [],
      }),
      [],
    ),
    /* --- Fetch Launches from HTTP API --- */
    fetchLaunches = s.useCallback(
      async (month) => {
        if (!httpBaseUrl) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          const authToken = getAuthToken(),
            { data: responseData } = await Pe.get(`${httpBaseUrl}/launches`, {
              headers: authToken
                ? {
                    Authorization: `Bearer ${authToken}`,
                  }
                : {},
              params: {
                mounth: month,
              },
            }),
            rawItems = Array.isArray(responseData?.items)
              ? responseData.items
              : Array.isArray(responseData)
                ? responseData
                : [];
          if (Array.isArray(rawItems)) {
            const normalizedLaunches = rawItems.map(normalizeLaunch);
            if (
              (setLaunches(
                normalizedLaunches.sort(
                  (launchA, launchB) =>
                    parseLaunchDate(launchA).valueOf() - parseLaunchDate(launchB).valueOf(),
                ),
              ),
              alertSettingsRef.current.autoWatchNew)
            ) {
              const newExchangeIds = normalizedLaunches.flatMap((launchItem) =>
                (launchItem.exchanges || []).map(
                  (exchangeEntry) => exchangeEntry.id,
                ),
              );
              if (newExchangeIds.length > 0) {
                setWatchedExchanges((prev) => {
                  const merged = new Set([...prev, ...newExchangeIds]);
                  return Array.from(merged);
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to carregar lancamentos", error);
        } finally {
          setIsLoading(false);
        }
      },
      [httpBaseUrl, normalizeLaunch],
    );

  /* Re-fetch when month changes */
  s.useEffect(() => {
    fetchLaunches(currentMonth);
  }, [fetchLaunches, currentMonth]);

  /* --- Notification Audio --- */
  const notificationAudioRef = s.useRef(null),
    [isAlarmPlaying, setIsAlarmPlaying] = s.useState(false),
    [alertingExchangeIds, setAlertingExchangeIds] = s.useState([]);

  s.useEffect(
    () => (
      (notificationAudioRef.current = new Audio("/sounds/notification.mp3")),
      (notificationAudioRef.current.loop = true),
      () => {
        if (notificationAudioRef.current) {
          (notificationAudioRef.current.pause(),
            (notificationAudioRef.current = null));
        }
      }
    ),
    [],
  );

  /* --- WebSocket Message Handler --- */
  const handleWsMessage = s.useCallback(
      (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data || "{}"),
            { action: actionType, payload: payload = {} } = parsed;
          if (actionType === "launch.created") {
            const normalizedLaunch = normalizeLaunch(payload);
            if (
              (setLaunches((prevLaunches) =>
                (prevLaunches.some(
                  (launchItem) => launchItem.id === normalizedLaunch.id,
                )
                  ? prevLaunches.map((launchItem) =>
                      launchItem.id === normalizedLaunch.id
                        ? {
                            ...launchItem,
                            ...normalizedLaunch,
                          }
                        : launchItem,
                    )
                  : [...prevLaunches, normalizedLaunch]
                ).sort(
                  (launchA, launchB) =>
                    parseLaunchDate(launchA).valueOf() - parseLaunchDate(launchB).valueOf(),
                ),
              ),
              alertSettingsRef.current.autoWatchNew)
            ) {
              const newExchangeIds = (normalizedLaunch.exchanges || []).map(
                (exchangeEntry) => exchangeEntry.id,
              );
              if (newExchangeIds.length > 0) {
                setWatchedExchanges((prev) => {
                  const merged = new Set([...prev, ...newExchangeIds]);
                  return Array.from(merged);
                });
              }
            }
            return;
          }
          if (actionType === "launch.deleted") {
            setLaunches((prevLaunches) =>
              prevLaunches.filter(
                (launchItem) => launchItem.id !== payload.launch_id,
              ),
            );
            return;
          }
          if (actionType === "launch.exchange.added") {
            const { launch_id: launchId, exchange: exchangeData } = payload;
            setLaunches((prevLaunches) =>
              prevLaunches.map((launchItem) => {
                if (launchItem.id !== launchId) return launchItem;
                const existingExchanges = launchItem.exchanges || [];
                return existingExchanges.some(
                  (exchangeEntry) => exchangeEntry.id === exchangeData.id,
                )
                  ? launchItem
                  : {
                      ...launchItem,
                      exchanges: [...existingExchanges, exchangeData],
                    };
              }),
            );
            if (alertSettingsRef.current.autoWatchNew) {
              setWatchedExchanges((prev) =>
                prev.includes(exchangeData.id)
                  ? prev
                  : [...prev, exchangeData.id],
              );
            }
            editingLaunch?.id;
            return;
          }
          if (actionType === "launch.exchange.removed") {
            const { launch_id: launchId, launch_exchange_id: exchangeId } =
              payload;
            setLaunches((prevLaunches) =>
              prevLaunches.map((launchItem) =>
                launchItem.id !== launchId
                  ? launchItem
                  : {
                      ...launchItem,
                      exchanges: (launchItem.exchanges || []).filter(
                        (exchangeEntry) => exchangeEntry.id !== exchangeId,
                      ),
                    },
              ),
            );
            return;
          }
          if (actionType === "launch.create.ack") return;
        } catch (error) {
          console.error("Erro ao processar mensagem WS", error);
        }
      },
      [normalizeLaunch],
    ),
    /* --- WebSocket Connection Manager --- */
    connectWebSocket = s.useCallback(() => {
      if (wsRef.current) {
        ((wsRef.current.onclose = null),
          (wsRef.current.onmessage = null),
          (wsRef.current.onerror = null),
          wsRef.current.close(),
          (wsRef.current = null));
      }
      try {
        const wsUrl = buildWsUrl(WS_BASE_URL),
          authenticatedUrl = (() => {
            try {
              const urlObj = new URL(wsUrl),
                token = getAuthToken();
              return (
                token && urlObj.searchParams.set("token", token),
                urlObj.toString()
              );
            } catch {
              return wsUrl;
            }
          })(),
          socket = new WebSocket(authenticatedUrl);
        wsRef.current = socket;
        socket.onopen = () => {
          const token = getAuthToken();
          if (token) {
            socket.send(
              JSON.stringify({
                action: "auth.login",
                payload: {
                  token: token,
                },
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }),
            );
          }
        };
        socket.onmessage = handleWsMessage;
        socket.onclose = () => {
          wsRef.current = null;
          reconnectTimerRef.current = setTimeout(connectWebSocket, 2e3);
        };
        socket.onerror = (errorEvent) => {
          console.error("Erro no websocket", errorEvent);
          socket.close();
        };
      } catch (error) {
        console.error("Falha ao conectar websocket", error);
        setTimeout(connectWebSocket, 2e3);
      }
    }, [handleWsMessage]);

  /* Connect WebSocket on mount, cleanup on unmount */
  s.useEffect(
    () => (
      connectWebSocket(),
      () => {
        if (reconnectTimerRef.current) {
          (clearTimeout(reconnectTimerRef.current),
            (reconnectTimerRef.current = null));
        }
        if (wsRef.current) {
          ((wsRef.current.onclose = null),
            (wsRef.current.onmessage = null),
            (wsRef.current.onerror = null),
            wsRef.current.close(),
            (wsRef.current = null));
        }
      }
    ),
    [connectWebSocket],
  );

  /* --- WebSocket Send Helper --- */
  const sendWsMessage = s.useCallback((action, payload, context = {}) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket não está conectado");
        return;
      }
      const token = getAuthToken(),
        message = {
          action: action,
          payload: payload,
          context: context,
        };
      if (token) {
        message.headers = {
          Authorization: `Bearer ${token}`,
        };
      }
      wsRef.current.send(JSON.stringify(message));
    }, []),
    /* --- Alarm Sound Controls --- */
    startAlarm = () => {
      if (notificationAudioRef.current && !isAlarmPlaying) {
        (notificationAudioRef.current
          .play()
          .catch((error) => console.error("Erro ao tocar", error)),
          setIsAlarmPlaying(true));
      }
    },
    stopAlarm = () => {
      if (notificationAudioRef.current && isAlarmPlaying) {
        (notificationAudioRef.current.pause(),
          (notificationAudioRef.current.currentTime = 0),
          setIsAlarmPlaying(false),
          setAlertingExchangeIds([]));
      }
    },
    /* --- Computed: Days in Current Week View --- */
    weekDays = s.useMemo(
      () =>
        Array.from(
          {
            length: DAYS_PER_PAGE,
          },
          (_, index) => weekStartDate.add(index, "day"),
        ),
      [weekStartDate],
    ),
    /* --- Computed: Filtered Launches (by search or by selected date) --- */
    filteredLaunches = s.useMemo(() => {
      const selectedDayjs = _(selectedDate),
        searchTerm = debouncedSearch.trim().toLowerCase();
      return searchTerm
        ? launches
            .filter((launchItem) =>
              launchItem.coin.toLowerCase().includes(searchTerm),
            )
            .sort(
              (launchA, launchB) =>
                parseLaunchDate(launchA).valueOf() - parseLaunchDate(launchB).valueOf(),
            )
        : launches
            .filter((launchItem) =>
              _(launchItem.date).isSame(selectedDayjs, "day"),
            )
            .sort(
              (launchA, launchB) =>
                parseLaunchDate(launchA).valueOf() - parseLaunchDate(launchB).valueOf(),
            );
    }, [launches, selectedDate, debouncedSearch]),
    /* --- Computed: Total number of exchange entries across all launches --- */
    totalExchangeCount = s.useMemo(
      () =>
        launches.reduce(
          (accumulator, launchItem) =>
            accumulator + (launchItem.exchanges?.length || 0),
          0,
        ),
      [launches],
    ),
    /* --- Computed: Dates that have alerting exchanges --- */
    alertingDates = s.useMemo(() => {
      const dateSet = new Set();
      return (
        alertingExchangeIds.length === 0 ||
          launches.forEach((launchItem) => {
            if (
              launchItem.exchanges?.some((exchangeEntry) =>
                alertingExchangeIds.includes(exchangeEntry.id),
              )
            ) {
              dateSet.add(launchItem.date);
            }
          }),
        dateSet
      );
    }, [launches, alertingExchangeIds]),
    /* --- Toggle Watch/Unwatch for a single exchange --- */
    toggleWatchExchange = (exchangeId) => {
      setWatchedExchanges((prev) =>
        prev.includes(exchangeId)
          ? prev.filter((watchedId) => watchedId !== exchangeId)
          : [...prev, exchangeId],
      );
    };

  /* --- Notification Check Timer (runs every second) --- */
  s.useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nowMs = Date.now();
      let shouldAlarm = false;
      const currentlyAlertingIds = [];
      launches.forEach((launchRecord) => {
        (launchRecord.exchanges || []).forEach((exchangeEntry) => {
          if (!watchedExchanges.includes(exchangeEntry.id)) return;
          const timeStr = exchangeEntry.time || launchRecord.time || "00:00";
          if (!timeStr.includes(":")) return;
          const launchTimestampMs = _.tz(
              `${launchRecord.date}T${timeStr}`,
              "America/Sao_Paulo",
            ).valueOf(),
            alertStartMs =
              launchTimestampMs - alertSettings.notifyBeforeMinutes * 60 * 1e3,
            alertEndMs =
              launchTimestampMs + alertSettings.notifyAfterMinutes * 60 * 1e3;
          if (nowMs >= alertStartMs && nowMs <= alertEndMs) {
            shouldAlarm = true;
            currentlyAlertingIds.push(exchangeEntry.id);
            const lastNotifyTime = lastNotifiedAt[exchangeEntry.id] || 0;
            if (nowMs - lastNotifyTime > 6e4) {
              const displayTime =
                  exchangeEntry.time || launchRecord.time || "00:00",
                notificationMessage = `Listagem ${launchRecord.coin} na ${exchangeEntry.exchange || "Exchange"} as ${displayTime}`;
              typeof Notification < "u" && Notification.permission === "granted"
                ? new Notification("Alerta de Listagem", {
                    body: notificationMessage,
                  })
                : typeof Notification < "u" &&
                  Notification.permission === "default" &&
                  Notification.requestPermission();
              console.info(notificationMessage);
              setLastNotifiedAt((prev) => ({
                ...prev,
                [exchangeEntry.id]: nowMs,
              }));
            }
          }
        });
      });
      setAlertingExchangeIds(currentlyAlertingIds);
      shouldAlarm ? startAlarm() : stopAlarm();
    }, 1e3);
    return () => window.clearInterval(intervalId);
  }, [
    launches,
    watchedExchanges,
    lastNotifiedAt,
    isAlarmPlaying,
    alertSettings,
  ]);

  /* --- Week Navigation --- */
  const navigateWeek = (direction) => {
      const newStart = weekStartDate.add(direction * DAYS_PER_PAGE, "day"),
        newEnd = newStart.add(DAYS_PER_PAGE - 1, "day");
      setWeekStartDate(newStart);
      const currentSelected = _(selectedDate);
      if (
        currentSelected.isBefore(newStart, "day") ||
        currentSelected.isAfter(newEnd, "day")
      ) {
        setSelectedDate(newStart.format("YYYY-MM-DD"));
      }
    },
    /* --- Select a specific day from the week bar --- */
    selectDay = (day) => {
      setSelectedDate(day.format("YYYY-MM-DD"));
    },
    /* --- Handle Create New Launch (form submit) --- */
    handleCreateLaunch = (event) => {
      if ((event.preventDefault(), !newLaunchForm.coin.trim())) {
        setFormError("Informe o nome da moeda");
        return;
      }
      const requestId =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sendWsMessage(
        "launch.create",
        {
          coin: newLaunchForm.coin.trim(),
          date: selectedDate,
          time: "00:00",
          link: "",
          notes: "",
          exchanges: [],
        },
        {
          request_id: requestId,
        },
      );
      setNewLaunchForm({
        coin: "",
      });
      setFormError(null);
      setIsNewLaunchModalOpen(false);
    },
    /* --- Open Exchange Editor Modal --- */
    openExchangeEditor = (launchId, defaultTime) => {
      if (!hasLaunchPermission) {
        setToastError(
          "Apenas usuários com permissão de lançamentos podem configurar corretoras.",
        );
        return;
      }
      const launch = launches.find((launchItem) => launchItem.id === launchId),
        defaultExchange = availableExchanges[0] || "",
        generatedLink = je(launch?.coin || "", defaultExchange, "spot");
      setEditingLaunchId(launchId);
      setExchangeForm({
        exchange: defaultExchange,
        market: "spot",
        time: defaultTime || "07:00",
        link: generatedLink,
        notes: "",
      });
      setExchangeFormError(null);
    },
    /* --- Close Exchange Editor Modal --- */
    closeExchangeEditor = () => {
      setEditingLaunchId(null);
      setExchangeFormError(null);
    },
    /* --- The launch currently being edited --- */
    editingLaunch = launches.find(
      (launchItem) => launchItem.id === editingLaunchId,
    ),
    /* --- Update a single field in the exchange form --- */
    updateExchangeFormField = (fieldName, fieldValue) => {
      setExchangeForm((prev) => {
        const updated = {
          ...prev,
          [fieldName]: fieldValue,
        };
        return (
          (fieldName === "exchange" || fieldName === "market") &&
            (updated.link = je(
              editingLaunch?.coin || "",
              updated.exchange,
              updated.market,
            )),
          updated
        );
      });
    },
    /* --- Handle Add Exchange to Launch (form submit) --- */
    handleAddExchange = (event) => {
      if ((event.preventDefault(), !editingLaunch)) return;
      if (!hasLaunchPermission) {
        setExchangeFormError("Bloqueado: permissão insuficiente.");
        return;
      }
      if (!exchangeForm.exchange) {
        setExchangeFormError("Escolha uma corretora.");
        return;
      }
      const link =
          exchangeForm.link ||
          je(editingLaunch.coin, exchangeForm.exchange, exchangeForm.market),
        requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      sendWsMessage(
        "launch.exchange.add",
        {
          launch_id: editingLaunch.id,
          exchange: exchangeForm.exchange,
          market: exchangeForm.market,
          time: exchangeForm.time || editingLaunch.time,
          link: link,
          notes: exchangeForm.notes.trim(),
        },
        {
          request_id: requestId,
        },
      );
      const optimisticExchange = {
        id: requestId,
        exchange: exchangeForm.exchange,
        market: exchangeForm.market,
        time: exchangeForm.time || editingLaunch.time,
        notes: exchangeForm.notes.trim(),
      };
      if (alertSettings.autoWatchNew) {
        setWatchedExchanges((prev) => [...prev, optimisticExchange.id]);
      }
      setExchangeForm((prev) => ({
        ...prev,
        time: editingLaunch.time,
        link: link,
        notes: "",
      }));
      setExchangeFormError(null);
    },
    /* --- Handle Notify Minutes Change --- */
    handleNotifyMinutesChange = (fieldName, value) => {
      const sanitizedValue = Math.max(0, Number(value) || 0);
      saveAlertPreferences({
        [fieldName]: sanitizedValue,
      });
    },
    /* --- Handle Auto-Watch Toggle --- */
    handleAutoWatchToggle = (checked) => {
      saveAlertPreferences({
        autoWatchNew: checked,
      });
    },
    /* --- Watch All Exchanges --- */
    watchAllExchanges = () => {
      const allExchangeIds = Array.from(
        new Set(
          launches.flatMap((launchItem) =>
            (launchItem.exchanges || []).map(
              (exchangeEntry) => exchangeEntry.id,
            ),
          ),
        ),
      );
      saveAlertPreferences({
        watchedExchanges: allExchangeIds,
        autoWatchNew: true,
      });
    },
    /* --- Unwatch All Exchanges --- */
    unwatchAllExchanges = () => {
      saveAlertPreferences({
        watchedExchanges: [],
        autoWatchNew: false,
      });
    },
    /* --- Remove Exchange from Launch --- */
    removeExchange = (exchangeId) => {
      if (!hasLaunchPermission) {
        setToastError(
          "Apenas usuários com permissão podem remover corretoras.",
        );
        return;
      }
      const requestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`;
      sendWsMessage(
        "launch.exchange.remove",
        {
          launch_id: editingLaunch?.id,
          launch_exchange_id: exchangeId,
        },
        {
          request_id: requestId,
        },
      );
      setLaunches((prevLaunches) =>
        prevLaunches.map((launchItem) =>
          launchItem.id === editingLaunch?.id
            ? {
                ...launchItem,
                exchanges: (launchItem.exchanges || []).filter(
                  (exchangeEntry) => exchangeEntry.id !== exchangeId,
                ),
              }
            : launchItem,
        ),
      );
    },
    /* --- Delete Entire Launch --- */
    deleteLaunch = (launchId) => {
      if (!hasLaunchPermission) {
        setToastError(
          "Apenas usuários com permissão podem excluir lançamentos.",
        );
        return;
      }
      if (confirm("Tem certeza que deseja excluir este lançamento?")) {
        const requestId = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`;
        sendWsMessage(
          "launch.delete",
          {
            launch_id: launchId,
          },
          {
            request_id: requestId,
          },
        );
        setLaunches((prevLaunches) =>
          prevLaunches.filter((launchItem) => launchItem.id !== launchId),
        );
      }
    };

  /* =======================================================
   *  RENDER
   * ======================================================= */
  return e.jsxs(bt, {
    title: "Novas Listagens",
    children: [
      /* --- Main Content Area --- */
      e.jsxs("div", {
        className:
          "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
        children: [
          /* --- Page Header & Controls --- */
          e.jsxs("div", {
            className: "flex flex-col gap-6 mb-8",
            children: [
              e.jsxs("div", {
                className:
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                children: [
                  e.jsxs("div", {
                    className: "flex flex-col gap-1",
                    children: [
                      e.jsx("div", {
                        className: "flex items-center gap-3",
                        children: e.jsx("h1", {
                          className:
                            "text-2xl font-bold text-gray-900 dark:text-dark-50",
                          children: "Novas listagens",
                        }),
                      }),
                      e.jsx("p", {
                        className: "text-sm text-gray-500 dark:text-dark-300",
                        children:
                          "Acompanhe os proximos lancamentos nas principais corretoras.",
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-3",
                    children: [
                      hasLaunchPermission &&
                        e.jsxs(Z, {
                          variant: "soft",
                          color: "primary",
                          className: "gap-2 h-9 px-4 text-sm font-medium",
                          onClick: () => setIsNewLaunchModalOpen(true),
                          children: [
                            e.jsx($t, {
                              className: "size-4",
                            }),
                            "Novo Token",
                          ],
                        }),
                      e.jsx(X, {
                        placeholder: "Pesquisar token...",
                        className: "w-full sm:w-[240px] h-9",
                        value: searchInputValue,
                        onChange: handleSearchChange,
                      }),
                      e.jsx(Z, {
                        variant: "soft",
                        color: "neutral",
                        className: "size-9 shrink-0 p-0",
                        onClick: () => setIsSettingsModalOpen(true),
                        title: "Configurações",
                        children: e.jsx(Mt, {
                          className: "size-5 text-gray-500 dark:text-gray-400",
                        }),
                      }),
                    ],
                  }),
                ],
              }),

              /* --- Week Day Selector Bar (hidden when searching) --- */
              !debouncedSearch &&
                e.jsxs("div", {
                  className:
                    "w-full bg-white dark:bg-dark-800/50 rounded-xl p-1.5 flex items-center justify-between border border-gray-200 dark:border-dark-700 shadow-sm overflow-x-auto",
                  children: [
                    e.jsx("button", {
                      onClick: () => navigateWeek(-1),
                      className:
                        "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition shrink-0",
                      children: e.jsx(Dt, {
                        className: "size-4",
                      }),
                    }),
                    e.jsx("div", {
                      className:
                        "flex flex-1 justify-between items-center px-2 min-w-[600px] gap-1",
                      children: weekDays.map((dayItem) => {
                        const dateStr = dayItem.format("YYYY-MM-DD"),
                          isSelected = dateStr === selectedDate,
                          isToday = dayItem.isSame(currentDate, "day"),
                          isAlerting =
                            alertingDates.has(dateStr) && !isSelected;
                        return e.jsxs(
                          "button",
                          {
                            onClick: () => selectDay(dayItem),
                            className: `relative flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition border ${isSelected ? "bg-white dark:bg-dark-700 border-gray-200 dark:border-dark-600 shadow-sm text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 dark:text-dark-400 hover:bg-gray-50 dark:hover:bg-dark-700/50 hover:text-gray-700 dark:hover:text-dark-200"}`,
                            children: [
                              isAlerting &&
                                e.jsxs("span", {
                                  className:
                                    "absolute top-1 right-1 flex h-2.5 w-2.5",
                                  children: [
                                    e.jsx("span", {
                                      className:
                                        "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75",
                                    }),
                                    e.jsx("span", {
                                      className:
                                        "relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500",
                                    }),
                                  ],
                                }),
                              e.jsx("span", {
                                className:
                                  "text-[10px] font-medium uppercase tracking-wider opacity-70",
                                children: dayItem.format("ddd"),
                              }),
                              e.jsx("span", {
                                className: "text-sm font-semibold",
                                children: isToday
                                  ? "Hoje"
                                  : dayItem.format("DD/MM"),
                              }),
                            ],
                          },
                          dateStr,
                        );
                      }),
                    }),
                    e.jsx("button", {
                      onClick: () => navigateWeek(1),
                      className:
                        "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition shrink-0",
                      children: e.jsx(Et, {
                        className: "size-4",
                      }),
                    }),
                  ],
                }),
            ],
          }),

          /* --- Launch Cards Grid --- */
          e.jsx("div", {
            className:
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5",
            children: isLoading
              ? Array.from({
                  length: 8,
                }).map((item, index) =>
                  e.jsx(LaunchCardSkeleton, {}, `launch-skeleton-${index}`),
                )
              : filteredLaunches.length === 0
                ? e.jsxs("div", {
                    className:
                      "col-span-full py-20 flex flex-col items-center justify-center text-gray-500 dark:text-dark-400 bg-white dark:bg-dark-800/50 rounded-xl border border-dashed border-gray-200 dark:border-dark-700",
                    children: [
                      e.jsx("div", {
                        className:
                          "size-12 rounded-full bg-gray-50 dark:bg-dark-700 flex items-center justify-center mb-3 text-gray-400 dark:text-dark-300",
                        children: e.jsx(Ee, {
                          className: "size-6",
                        }),
                      }),
                      e.jsx("p", {
                        className: "text-sm",
                        children: "Nenhuma listagem agendada para este dia.",
                      }),
                      hasLaunchPermission &&
                        e.jsx("button", {
                          onClick: () => setIsNewLaunchModalOpen(true),
                          className:
                            "mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline",
                          children: "Cadastrar novo token",
                        }),
                    ],
                  })
                : filteredLaunches.map((launchData) => {
                    const launchDate = parseLaunchDate(launchData),
                      exchangesList = launchData.exchanges || [];
                    return e.jsxs(
                      "div",
                      {
                        className:
                          "group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-primary-200 hover:shadow-md dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-500/30",
                        children: [
                          /* Card Header */
                          e.jsxs("div", {
                            className:
                              "p-5 flex items-start justify-between mb-0",
                            children: [
                              e.jsxs("div", {
                                className: "flex items-center gap-3",
                                children: [
                                  e.jsx("div", {
                                    className:
                                      "size-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800 border border-gray-200 dark:border-dark-600 flex items-center justify-center text-gray-700 dark:text-dark-200 font-bold text-sm shadow-inner",
                                    children: launchData.coin
                                      .charAt(0)
                                      .toUpperCase(),
                                  }),
                                  e.jsxs("div", {
                                    children: [
                                      e.jsx("h3", {
                                        className:
                                          "text-base font-bold text-gray-900 dark:text-dark-50 leading-tight",
                                        children: launchData.coin,
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-[11px] text-gray-500 dark:text-dark-400 uppercase tracking-wide",
                                        children: "Token",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              e.jsx(CountdownTimer, {
                                targetDate: launchDate,
                                launch: launchData,
                              }),
                            ],
                          }),

                          /* Card Body – Date & Exchanges */
                          e.jsxs("div", {
                            className: "flex-1 space-y-4 px-5 pb-5",
                            children: [
                              /* Date display */
                              e.jsxs("div", {
                                className:
                                  "rounded border border-gray-100 bg-gray-50 p-2 dark:border-dark-700 dark:bg-dark-700/50",
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "mb-0.5 text-[10px] text-gray-500 dark:text-dark-400",
                                    children: "Data",
                                  }),
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-medium text-gray-900 dark:text-dark-100",
                                    children: launchDate.format("DD/MM/YYYY"),
                                  }),
                                ],
                              }),

                              /* Confirmed Exchanges List */
                              e.jsxs("div", {
                                children: [
                                  e.jsxs("div", {
                                    className:
                                      "flex items-center justify-between mb-2",
                                    children: [
                                      e.jsx("p", {
                                        className:
                                          "text-[11px] font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wide",
                                        children: "Exchanges Confirmadas",
                                      }),
                                      e.jsxs("span", {
                                        className:
                                          "text-[10px] text-gray-400 dark:text-dark-500",
                                        children: [
                                          exchangesList.length,
                                          " total",
                                        ],
                                      }),
                                    ],
                                  }),
                                  e.jsx("div", {
                                    className:
                                      "flex flex-col gap-2 min-h-[60px]",
                                    children:
                                      exchangesList.length === 0
                                        ? e.jsx("div", {
                                            className:
                                              "flex items-center justify-center h-full text-[11px] text-gray-400 dark:text-dark-500 italic border border-dashed border-gray-200 dark:border-dark-700 rounded bg-gray-50/50 dark:bg-dark-800/50 p-2",
                                            children: "Aguardando confirmacao",
                                          })
                                        : exchangesList.map((exchangeItem) => {
                                            const isWatched =
                                                watchedExchanges.includes(
                                                  exchangeItem.id,
                                                ),
                                              isCurrentlyAlerting =
                                                alertingExchangeIds.includes(
                                                  exchangeItem.id,
                                                );
                                            return e.jsxs(
                                              "div",
                                              {
                                                className: `flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-dark-700/30 border transition group/item relative ${isCurrentlyAlerting ? "animate-pulse border-primary-500 ring-1 ring-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-100 dark:border-dark-700 hover:bg-gray-100 dark:hover:bg-dark-700 hover:border-primary-200 dark:hover:border-primary-500/30"}`,
                                                children: [
                                                  exchangeItem.link
                                                    ? e.jsx("a", {
                                                        href: exchangeItem.link,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        className:
                                                          "absolute inset-0 z-0",
                                                      })
                                                    : null,
                                                  e.jsxs("div", {
                                                    className:
                                                      "flex items-center gap-2 relative z-10 pointer-events-none",
                                                    children: [
                                                      e.jsx("div", {
                                                        className: `size-5 rounded-full flex items-center justify-center text-[8px] font-bold uppercase ${getExchangeBadgeClass(exchangeItem.exchange)}`,
                                                        children: (
                                                          exchangeItem.exchange ||
                                                          ""
                                                        ).substring(0, 2),
                                                      }),
                                                      e.jsxs("div", {
                                                        className:
                                                          "flex flex-col",
                                                        children: [
                                                          e.jsx("span", {
                                                            className:
                                                              "text-xs text-gray-700 dark:text-dark-200 font-medium leading-none",
                                                            children:
                                                              exchangeItem.exchange,
                                                          }),
                                                          e.jsx("span", {
                                                            className:
                                                              "text-[10px] text-gray-400 mt-0.5 group-hover/item:text-primary-500 transition-colors",
                                                            children:
                                                              exchangeItem.time ||
                                                              exchangeItem.time ||
                                                              "--:--",
                                                          }),
                                                        ],
                                                      }),
                                                    ],
                                                  }),
                                                  e.jsxs("div", {
                                                    className:
                                                      "flex items-center gap-2 relative z-10",
                                                    children: [
                                                      e.jsx(Ke, {
                                                        component: "span",
                                                        variant: "soft",
                                                        color: "neutral",
                                                        className:
                                                          "text-[10px] px-1.5 py-0.5 uppercase pointer-events-none",
                                                        children:
                                                          exchangeItem.market,
                                                      }),
                                                      e.jsx("button", {
                                                        onClick: (event) => {
                                                          event.preventDefault();
                                                          event.stopPropagation();
                                                          toggleWatchExchange(
                                                            exchangeItem.id,
                                                          );
                                                        },
                                                        className: `p-1 rounded-full transition ${isWatched ? "text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`,
                                                        title: isWatched
                                                          ? "Desativar alerta"
                                                          : "Ativar alerta",
                                                        children: isWatched
                                                          ? e.jsx(
                                                              BellAlertIcon,
                                                              {
                                                                className:
                                                                  "size-3.5",
                                                              },
                                                            )
                                                          : e.jsx(wt, {
                                                              className:
                                                                "size-3.5",
                                                            }),
                                                      }),
                                                    ],
                                                  }),
                                                ],
                                              },
                                              exchangeItem.id,
                                            );
                                          }),
                                  }),
                                ],
                              }),
                            ],
                          }),

                          /* Card Footer – Action Buttons */
                          e.jsxs("div", {
                            className:
                              "mt-auto flex gap-2 rounded-b-xl border-t border-gray-100 bg-gray-50/50 p-4 dark:border-dark-700 dark:bg-dark-800/50",
                            children: [
                              hasLaunchPermission &&
                                e.jsx(Z, {
                                  variant: "soft",
                                  color: "neutral",
                                  className: "h-9 w-full flex-1 text-xs",
                                  onClick: () =>
                                    openExchangeEditor(
                                      launchData.id,
                                      launchData.time,
                                    ),
                                  children: "Editar",
                                }),
                              hasLaunchPermission &&
                                e.jsx(Z, {
                                  variant: "soft",
                                  color: "error",
                                  className: "size-9 shrink-0 p-0",
                                  onClick: () => deleteLaunch(launchData.id),
                                  title: "Excluir Lançamento",
                                  children: e.jsx(St, {
                                    className: "size-4",
                                  }),
                                }),
                            ],
                          }),
                        ],
                      },
                      launchData.id,
                    );
                  }),
          }),

          /* --- Error Toast Banner --- */
          toastError &&
            e.jsxs("div", {
              className:
                "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-xl dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-200 animate-in slide-in-from-bottom-5",
              children: [
                e.jsx(ShieldExclamationIcon, {
                  className: "size-5",
                }),
                e.jsx("span", {
                  children: toastError,
                }),
                e.jsx("button", {
                  className:
                    "ml-auto text-xs underline hover:text-red-900 dark:hover:text-white",
                  onClick: () => setToastError(null),
                  children: "Fechar",
                }),
              ],
            }),
        ],
      }),

      /* =======================================================
       *  MODAL: Alert Settings Configuration
       * ======================================================= */
      e.jsx(Ne, {
        appear: true,
        show: isSettingsModalOpen,
        as: s.Fragment,
        children: e.jsxs(we, {
          as: "div",
          className: "relative z-50",
          onClose: () => setIsSettingsModalOpen(false),
          children: [
            e.jsx(ee, {
              as: s.Fragment,
              enter: "ease-out duration-200",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-150",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className: "flex min-h-full items-center justify-center p-4",
                children: e.jsxs(ee, {
                  as: $e,
                  className:
                    "w-full max-w-xl rounded-2xl bg-white dark:bg-dark-800 p-6 shadow-2xl transition dark:border dark:border-dark-700",
                  children: [
                    /* Modal Header */
                    e.jsxs("div", {
                      className: "flex items-start justify-between gap-4 mb-6",
                      children: [
                        e.jsxs("div", {
                          children: [
                            e.jsx(Se, {
                              className:
                                "text-lg font-bold text-gray-900 dark:text-dark-50",
                              children: "Configurar alertas",
                            }),
                            e.jsx("p", {
                              className:
                                "text-sm text-gray-500 dark:text-dark-400 mt-1",
                              children:
                                "Ajuste a janela de notificacao e como novos alertas devem se comportar.",
                            }),
                          ],
                        }),
                        e.jsx("button", {
                          onClick: () => setIsSettingsModalOpen(false),
                          className:
                            "text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200 transition",
                          title: "Fechar",
                          children: e.jsx(xe, {
                            className: "size-5",
                          }),
                        }),
                      ],
                    }),

                    /* Modal Body */
                    e.jsxs("div", {
                      className: "space-y-5",
                      children: [
                        /* Notification timing inputs */
                        e.jsxs("div", {
                          className: "grid gap-4 md:grid-cols-2",
                          children: [
                            e.jsx(X, {
                              label: "Notificar antes (min)",
                              type: "number",
                              min: 0,
                              value: alertSettings.notifyBeforeMinutes,
                              onChange: (event) =>
                                handleNotifyMinutesChange(
                                  "notifyBeforeMinutes",
                                  event.target.value,
                                ),
                            }),
                            e.jsx(X, {
                              label: "Notificar depois (min)",
                              type: "number",
                              min: 0,
                              value: alertSettings.notifyAfterMinutes,
                              onChange: (event) =>
                                handleNotifyMinutesChange(
                                  "notifyAfterMinutes",
                                  event.target.value,
                                ),
                            }),
                          ],
                        }),

                        /* Auto-watch toggle */
                        e.jsxs("div", {
                          className:
                            "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-700 dark:bg-dark-700/40 flex items-center justify-between gap-3",
                          children: [
                            e.jsxs("div", {
                              children: [
                                e.jsx("p", {
                                  className:
                                    "text-sm font-medium text-gray-800 dark:text-dark-100",
                                  children:
                                    "Ativar novas notificações automaticamente",
                                }),
                                e.jsx("p", {
                                  className:
                                    "text-xs text-gray-500 dark:text-dark-400",
                                  children:
                                    "Toda nova corretora adicionada entra marcada para alerta.",
                                }),
                              ],
                            }),
                            e.jsx(pt, {
                              checked: alertSettings.autoWatchNew,
                              onChange: (event) =>
                                handleAutoWatchToggle(event.target.checked),
                            }),
                          ],
                        }),

                        /* Bulk watch/unwatch actions */
                        e.jsxs("div", {
                          className:
                            "rounded-xl border border-dashed border-gray-200 dark:border-dark-700 px-4 py-4 bg-white dark:bg-dark-800/60 space-y-3",
                          children: [
                            e.jsx("div", {
                              className:
                                "flex items-start justify-between gap-3",
                              children: e.jsxs("div", {
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-sm font-semibold text-gray-900 dark:text-dark-50",
                                    children: "Marcar todas as notificações",
                                  }),
                                  e.jsxs("p", {
                                    className:
                                      "text-xs text-gray-500 dark:text-dark-400",
                                    children: [
                                      "Aplica o alerta em todas as exchanges ja cadastradas (",
                                      totalExchangeCount,
                                      " no total).",
                                    ],
                                  }),
                                ],
                              }),
                            }),
                            e.jsxs("div", {
                              className: "flex flex-col sm:flex-row gap-3",
                              children: [
                                e.jsx(Z, {
                                  type: "button",
                                  color: "primary",
                                  className: "flex-1",
                                  disabled: !totalExchangeCount,
                                  onClick: watchAllExchanges,
                                  children: "Marcar todas",
                                }),
                                e.jsx(Z, {
                                  type: "button",
                                  variant: "soft",
                                  color: "neutral",
                                  className: "flex-1",
                                  onClick: unwatchAllExchanges,
                                  children: "Desmarcar todas",
                                }),
                                e.jsx(Z, {
                                  type: "button",
                                  variant: "soft",
                                  color: "neutral",
                                  className: "sm:w-[160px]",
                                  onClick: () => setIsSettingsModalOpen(false),
                                  children: "Fechar",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),

      /* =======================================================
       *  MODAL: Create New Launch
       * ======================================================= */
      e.jsx(Ne, {
        appear: true,
        show: isNewLaunchModalOpen,
        as: s.Fragment,
        children: e.jsxs(we, {
          as: "div",
          className: "relative z-50",
          onClose: () => setIsNewLaunchModalOpen(false),
          children: [
            e.jsx(ee, {
              as: s.Fragment,
              enter: "ease-out duration-200",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-150",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className: "flex min-h-full items-center justify-center p-4",
                children: e.jsxs(ee, {
                  as: $e,
                  className:
                    "w-full max-w-md rounded-2xl bg-white dark:bg-dark-800 p-6 shadow-2xl transition dark:border dark:border-dark-700",
                  children: [
                    e.jsxs("div", {
                      className: "flex items-start justify-between gap-4 mb-6",
                      children: [
                        e.jsx(Se, {
                          className:
                            "text-lg font-bold text-gray-900 dark:text-dark-50",
                          children: "Novo lancamento",
                        }),
                        e.jsx("button", {
                          onClick: () => setIsNewLaunchModalOpen(false),
                          className:
                            "text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200 transition",
                          children: e.jsx(xe, {
                            className: "size-5",
                          }),
                        }),
                      ],
                    }),
                    e.jsxs("form", {
                      className: "space-y-4",
                      onSubmit: handleCreateLaunch,
                      children: [
                        e.jsx(X, {
                          label: "Moeda / Token",
                          placeholder: "Ex.: PYBOBO",
                          value: newLaunchForm.coin,
                          onChange: (event) =>
                            setNewLaunchForm({
                              coin: event.target.value,
                            }),
                          required: true,
                        }),
                        formError &&
                          e.jsx("p", {
                            className: "text-sm text-red-500",
                            children: formError,
                          }),
                        e.jsx(Z, {
                          type: "submit",
                          color: "primary",
                          className: "w-full font-medium",
                          children: "Registrar Token",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),

      /* =======================================================
       *  MODAL: Configure Exchanges for a Launch
       * ======================================================= */
      e.jsx(Ne, {
        appear: true,
        show: !!editingLaunch,
        as: s.Fragment,
        children: e.jsxs(we, {
          as: "div",
          className: "relative z-50",
          onClose: closeExchangeEditor,
          children: [
            e.jsx(ee, {
              as: s.Fragment,
              enter: "ease-out duration-200",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-150",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className: "flex min-h-full items-center justify-center p-4",
                children: e.jsxs(ee, {
                  as: $e,
                  className:
                    "w-full max-w-2xl rounded-2xl bg-white dark:bg-dark-800 p-6 shadow-2xl transition dark:border dark:border-dark-700",
                  children: [
                    /* Modal Header with coin name */
                    e.jsxs("div", {
                      className: "flex items-start justify-between gap-4 mb-6",
                      children: [
                        e.jsxs("div", {
                          children: [
                            e.jsx(Se, {
                              className:
                                "text-lg font-bold text-gray-900 dark:text-dark-50",
                              children: "Configurar corretoras",
                            }),
                            e.jsxs("div", {
                              className: "flex items-center gap-2 mt-1",
                              children: [
                                e.jsx("span", {
                                  className:
                                    "text-sm text-gray-500 dark:text-dark-400",
                                  children: "Gerenciando:",
                                }),
                                e.jsx("span", {
                                  className:
                                    "px-2 py-0.5 bg-gray-100 dark:bg-dark-700 rounded text-xs font-mono text-gray-700 dark:text-dark-200",
                                  children: editingLaunch?.coin,
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.jsx("button", {
                          onClick: closeExchangeEditor,
                          className:
                            "text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200 transition",
                          children: e.jsx(xe, {
                            className: "size-5",
                          }),
                        }),
                      ],
                    }),

                    /* Two-column layout: Add New | Configured List */
                    e.jsxs("div", {
                      className: "grid gap-8 md:grid-cols-2",
                      children: [
                        /* Left Column: Add New Exchange Form */
                        e.jsxs("div", {
                          className: "space-y-4",
                          children: [
                            e.jsx("h4", {
                              className:
                                "text-xs font-semibold uppercase text-gray-500 dark:text-dark-400 tracking-wider",
                              children: "Adicionar Nova",
                            }),
                            e.jsxs("form", {
                              className: "space-y-4",
                              onSubmit: handleAddExchange,
                              children: [
                                e.jsx(_e, {
                                  label: "Corretora",
                                  data: availableExchanges,
                                  value: exchangeForm.exchange,
                                  onChange: (event) =>
                                    updateExchangeFormField(
                                      "exchange",
                                      event.target.value,
                                    ),
                                }),
                                e.jsxs("div", {
                                  className: "grid grid-cols-2 gap-3",
                                  children: [
                                    e.jsx(_e, {
                                      label: "Mercado",
                                      data: MARKET_OPTIONS,
                                      value: exchangeForm.market,
                                      onChange: (event) =>
                                        updateExchangeFormField(
                                          "market",
                                          event.target.value,
                                        ),
                                    }),
                                    e.jsx(X, {
                                      label: "Horário (Brasília)",
                                      type: "time",
                                      value: exchangeForm.time,
                                      onChange: (event) =>
                                        updateExchangeFormField(
                                          "time",
                                          event.target.value,
                                        ),
                                    }),
                                  ],
                                }),
                                e.jsx(X, {
                                  label: "Link Oficial",
                                  value: exchangeForm.link,
                                  onChange: (event) =>
                                    updateExchangeFormField(
                                      "link",
                                      event.target.value,
                                    ),
                                  placeholder: "https://...",
                                }),
                                e.jsx(kt, {
                                  label: "Notas Internas",
                                  rows: 2,
                                  value: exchangeForm.notes,
                                  onChange: (event) =>
                                    updateExchangeFormField(
                                      "notes",
                                      event.target.value,
                                    ),
                                }),
                                exchangeFormError &&
                                  e.jsx("p", {
                                    className: "text-sm text-red-500",
                                    children: exchangeFormError,
                                  }),
                                e.jsx(Z, {
                                  type: "submit",
                                  color: "primary",
                                  className: "w-full font-medium",
                                  children: "Adicionar Corretora",
                                }),
                              ],
                            }),
                          ],
                        }),

                        /* Right Column: Configured Exchanges List */
                        e.jsxs("div", {
                          className:
                            "space-y-4 border-l border-gray-100 dark:border-dark-700 pl-6",
                          children: [
                            (() => {
                              const configuredExchanges =
                                editingLaunch?.exchanges || [];
                              return e.jsxs("h4", {
                                className:
                                  "text-xs font-semibold uppercase text-gray-500 dark:text-dark-400 tracking-wider",
                                children: [
                                  "Configuradas (",
                                  configuredExchanges.length,
                                  ")",
                                ],
                              });
                            })(),
                            e.jsxs("div", {
                              className:
                                "space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar",
                              children: [
                                (editingLaunch?.exchanges || []).length === 0 &&
                                  e.jsx("div", {
                                    className:
                                      "text-center py-8 border border-dashed border-gray-200 dark:border-dark-700 rounded-lg",
                                    children: e.jsx("p", {
                                      className:
                                        "text-sm text-gray-500 dark:text-dark-400",
                                      children: "Nenhuma corretora adicionada.",
                                    }),
                                  }),
                                (editingLaunch?.exchanges || []).map(
                                  (exchangeItem) =>
                                    e.jsxs(
                                      "div",
                                      {
                                        className:
                                          "group relative flex flex-col bg-gray-50 dark:bg-dark-700/50 p-3 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-primary-300 dark:hover:border-primary-500/50 transition",
                                        children: [
                                          e.jsxs("div", {
                                            className:
                                              "flex justify-between items-start mb-2",
                                            children: [
                                              e.jsxs("div", {
                                                className:
                                                  "flex items-center gap-2",
                                                children: [
                                                  e.jsx("div", {
                                                    className: `size-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase ${getExchangeBadgeClass(exchangeItem.exchange)}`,
                                                    children: (
                                                      exchangeItem.exchange ||
                                                      ""
                                                    ).substring(0, 2),
                                                  }),
                                                  e.jsxs("div", {
                                                    children: [
                                                      e.jsx("p", {
                                                        className:
                                                          "font-medium text-gray-900 dark:text-dark-50 text-sm",
                                                        children:
                                                          exchangeItem.exchange,
                                                      }),
                                                      e.jsx("p", {
                                                        className:
                                                          "text-[10px] text-gray-500 dark:text-dark-400 uppercase",
                                                        children:
                                                          exchangeItem.market,
                                                      }),
                                                    ],
                                                  }),
                                                ],
                                              }),
                                              e.jsx("button", {
                                                onClick: () =>
                                                  removeExchange(
                                                    exchangeItem.id,
                                                  ),
                                                className:
                                                  "text-gray-400 hover:text-red-500 dark:text-dark-400 dark:hover:text-red-400 p-1",
                                                children: e.jsx(xe, {
                                                  className: "size-4",
                                                }),
                                              }),
                                            ],
                                          }),
                                          e.jsxs("div", {
                                            className:
                                              "flex items-center gap-3 text-xs text-gray-600 dark:text-dark-300 bg-white dark:bg-dark-800 p-2 rounded border border-gray-100 dark:border-dark-700",
                                            children: [
                                              e.jsxs("div", {
                                                className:
                                                  "flex items-center gap-1",
                                                children: [
                                                  e.jsx(Ee, {
                                                    className: "size-3",
                                                  }),
                                                  exchangeItem.time,
                                                ],
                                              }),
                                              exchangeItem.link &&
                                                e.jsx("a", {
                                                  href: exchangeItem.link,
                                                  target: "_blank",
                                                  className:
                                                    "text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[120px]",
                                                  rel: "noreferrer",
                                                  children: "Link",
                                                }),
                                            ],
                                          }),
                                        ],
                                      },
                                      exchangeItem.id,
                                    ),
                                ),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
export { MonitoringPage as default };
