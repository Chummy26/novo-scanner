/* ---- Module Utility: Merge Exports ---- */
import { r as m, g as d } from "./index-Bx06KCE-.js";
function mergeExports(target, sources) {
  for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    const source = sources[sourceIndex];
    if (typeof source != "string" && !Array.isArray(source)) {
      for (const key in source)
        if (key !== "default" && !(key in target)) {
          const descriptor = Object.getOwnPropertyDescriptor(source, key);
          if (descriptor) {
            Object.defineProperty(
              target,
              key,
              descriptor.get
                ? descriptor
                : {
                    enumerable: !0,
                    get: () => source[key],
                  },
            );
          }
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(target, Symbol.toStringTag, {
      value: "Module",
    }),
  );
}

/* ---- Day.js Portuguese-BR Locale Plugin ---- */
var moduleWrapper = {
    exports: {},
  },
  exportsTarget = moduleWrapper.exports,
  initialized;
function loadLocale() {
  return (
    initialized ||
      ((initialized = 1),
      (function (moduleObj, unusedExports) {
        (function (root, factory) {
          moduleObj.exports = factory(m());
        })(exportsTarget, function (dayjs) {
          function ensureDefault(module) {
            return module && typeof module == "object" && "default" in module
              ? module
              : {
                  default: module,
                };
          }
          var dayjsModule = ensureDefault(dayjs),
            localeConfig = {
              name: "pt-br",
              weekdays:
                "domingo_segunda-feira_terça-feira_quarta-feira_quinta-feira_sexta-feira_sábado".split(
                  "_",
                ),
              weekdaysShort: "dom_seg_ter_qua_qui_sex_sáb".split("_"),
              weekdaysMin: "Do_2ª_3ª_4ª_5ª_6ª_Sá".split("_"),
              months:
                "janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro".split(
                  "_",
                ),
              monthsShort:
                "jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez".split("_"),
              ordinal: function (number) {
                return number + "º";
              },
              formats: {
                LT: "HH:mm",
                LTS: "HH:mm:ss",
                L: "DD/MM/YYYY",
                LL: "D [de] MMMM [de] YYYY",
                LLL: "D [de] MMMM [de] YYYY [às] HH:mm",
                LLLL: "dddd, D [de] MMMM [de] YYYY [às] HH:mm",
              },
              relativeTime: {
                future: "em %s",
                past: "há %s",
                s: "poucos segundos",
                m: "um minuto",
                mm: "%d minutos",
                h: "uma hora",
                hh: "%d horas",
                d: "um dia",
                dd: "%d dias",
                M: "um mês",
                MM: "%d meses",
                y: "um ano",
                yy: "%d anos",
              },
            };
          return (dayjsModule.default.locale(localeConfig, null, !0), localeConfig);
        });
      })(moduleWrapper)),
    moduleWrapper.exports
  );
}

/* ---- Export Locale as ES Module ---- */
var localeExport = loadLocale();
const defaultExport = d(localeExport),
  ptBrLocaleModule = mergeExports(
    {
      __proto__: null,
      default: defaultExport,
    },
    [localeExport],
  );
export { ptBrLocaleModule as p };
