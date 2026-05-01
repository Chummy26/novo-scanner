/* ========================================
 * User Preferences Module
 * Gerencia preferencias do usuario (scanner, monitoring, audio, launches)
 * Persiste em localStorage + sincroniza com API /user/preferences
 * ======================================== */

import { a as React, E as axiosInstance } from "./index-Bx06KCE-.js";

/* ---- BellIcon (Heroicon - notificacao) ---- */
function BellIconRender({ title: titleText, titleId, ...restProps }, ref) {
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
    titleText ? React.createElement("title", { id: titleId }, titleText) : null,
    React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
    }),
  );
}

const BellIcon = React.forwardRef(BellIconRender);

/* ---- Constantes ---- */

const OPPORTUNITY_TYPE_OPTIONS = [
  {
    value: "SPOT-FUTURO",
    label: "Spot x Futuro",
    description: "Compra em spot e venda no mercado futuro",
  },
  {
    value: "FUTURO-FUTURO",
    label: "Futuro x Futuro",
    description: "Estratégias entre contratos futuros",
  },
];

const WS_SCANNER_URL = "ws://127.0.0.1:8000/ws";
const WS_BASE_URL = "ws://127.0.0.1:8000";
const PINS_STORAGE_KEY = "teamop.scanner.pins";
const WATCHDOG_TIMEOUT_SECONDS = 120;

/* ---- Filtros padrao do scanner ---- */

const DEFAULT_SCANNER_FILTERS = {
  exchange1: [],
  exchange2: [],
  opportunityTypes: [],
  volumeMin: 0,
  spreadMin: 0,
  invertedMin: 0,
  invertedWindow: "4h",
  profitSpreadMin: 0,
  profitSpreadTelegramMin: 0,
  blacklist: [],
  whitelist: [],
  maxPosition: 0,
  fixed: false,
  tableUpdateSeconds: 0.5,
};

const PREFERENCES_STORAGE_KEY = "teamop.preferences.v1";
const PREFERENCES_API_ENDPOINT = "/user/preferences";
const MAX_REMOVED_SIGNALS = 500;

/* ---- Helpers de parse numerico ---- */

/**
 * Tenta converter um valor para numero finito. Retorna null se invalido.
 */
const parseFiniteNumber = (value) => {
  if (typeof value == "number" && Number.isFinite(value)) return value;
  if (typeof value == "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

/**
 * Parse de volume (0-1). Retorna fallback se invalido.
 */
const parseVolume = (value, fallback) => {
  const parsedValue = parseFiniteNumber(value);
  return parsedValue === null ? fallback : Math.min(1, Math.max(0, parsedValue));
};

/**
 * Extrai tableUpdateSeconds de filtros, suportando formato legado tableUpdateMs.
 */
const extractTableUpdateSeconds = (filters) => {
  const secondsValue = parseFiniteNumber(filters.tableUpdateSeconds);
  if (secondsValue !== null && secondsValue >= 0) return secondsValue;
  const legacyMilliseconds = parseFiniteNumber(filters.tableUpdateMs);
  return legacyMilliseconds !== null && legacyMilliseconds >= 0
    ? legacyMilliseconds / 1000
    : DEFAULT_SCANNER_FILTERS.tableUpdateSeconds;
};

/**
 * Normaliza array de filter profiles, migrando tableUpdateMs -> tableUpdateSeconds.
 */
const normalizeFilterProfiles = (profiles) =>
  profiles.map((profile) => {
    const filters = profile.filters;
    const tableUpdateSeconds = extractTableUpdateSeconds(filters);
    const cleanedFilters = { ...filters };
    if ("tableUpdateMs" in cleanedFilters) delete cleanedFilters.tableUpdateMs;
    return {
      ...profile,
      filters: {
        ...DEFAULT_SCANNER_FILTERS,
        ...cleanedFilters,
        tableUpdateSeconds,
      },
    };
  });

/* ---- Preferencias padrao ---- */

const DEFAULT_PREFERENCES = {
  launches: {
    notifyBeforeMinutes: 1,
    notifyAfterMinutes: 1,
    autoWatchNew: false,
    watchedExchanges: [],
    enableSound: true,
    soundFile: "default",
    volume: 0.65,
  },
  monitoring: {
    enableSoundAlerts: false,
    hideZeroBalances: false,
    globalMinLiquidity: 0,
    activePanelId: null,
    soundFile: "siren",
    volume: 0.7,
  },
  scanner: {
    filterProfiles: [
      {
        id: "default",
        name: "Padrão",
        filters: { ...DEFAULT_SCANNER_FILTERS },
      },
    ],
    activeProfileId: "default",
    removedSignals: [],
    mutedSignals: [],
    selectedMonitoringPanelId: undefined,
    enableSound: true,
    soundFile: "coin",
    volume: 0.75,
  },
  audio: {
    masterVolume: 0.7,
  },
};

/**
 * Deep clone das preferencias (evita mutacao).
 */
const deepClonePreferences = (sourcePreferences) => ({
  launches: {
    ...sourcePreferences.launches,
    watchedExchanges: [...sourcePreferences.launches.watchedExchanges],
  },
  monitoring: {
    ...sourcePreferences.monitoring,
  },
  scanner: {
    ...sourcePreferences.scanner,
    activeProfileId: sourcePreferences.scanner.activeProfileId,
    selectedMonitoringPanelId: sourcePreferences.scanner.selectedMonitoringPanelId,
    filterProfiles: normalizeFilterProfiles(sourcePreferences.scanner.filterProfiles),
    removedSignals: [...sourcePreferences.scanner.removedSignals],
    mutedSignals: [...sourcePreferences.scanner.mutedSignals],
  },
  audio: {
    ...sourcePreferences.audio,
  },
});

/** Snapshot inicial das preferencias padrao (clonado) */
const INITIAL_PREFERENCES = deepClonePreferences(DEFAULT_PREFERENCES);

/** Gera uma copia fresca das preferencias padrao */
const getDefaultPreferences = () => deepClonePreferences(DEFAULT_PREFERENCES);

/**
 * Carrega preferencias do localStorage.
 */
const loadFromLocalStorage = () => {
  if (typeof localStorage > "u") return null;
  try {
    const storedJson = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!storedJson) return null;
    const parsedPreferences = JSON.parse(storedJson);
    return mergeWithDefaults(parsedPreferences);
  } catch {
    return null;
  }
};

/**
 * Salva preferencias no localStorage.
 */
const saveToLocalStorage = (preferences) => {
  if (typeof localStorage > "u") return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {}
};

/**
 * Limpa e deduplica um array de strings.
 * @param {Array} inputArray - Array para limpar
 * @param {number} [maxItems] - Limite maximo de itens
 */
const cleanStringArray = (inputArray, maxItems) => {
  if (!Array.isArray(inputArray)) return [];
  const trimmedItems = inputArray
    .map((item) => (typeof item == "string" ? item.trim() : ""))
    .filter(Boolean);
  const uniqueItems = Array.from(new Set(trimmedItems));
  return typeof maxItems == "number" ? uniqueItems.slice(0, maxItems) : uniqueItems;
};

/**
 * Merge parcial de preferencias sobre os defaults, validando cada campo.
 */
const mergeWithDefaults = (partialPrefs) => {
  const defaults = getDefaultPreferences();
  if (!partialPrefs) return defaults;

  const launchesPrefs = {
    ...defaults.launches,
    ...(partialPrefs.launches ?? {}),
    watchedExchanges: Array.isArray(partialPrefs.launches?.watchedExchanges)
      ? partialPrefs.launches.watchedExchanges
      : defaults.launches.watchedExchanges,
    volume: parseVolume(
      partialPrefs.launches?.volume,
      defaults.launches.volume ?? 0.7,
    ),
  };

  const monitoringPrefs = {
    ...defaults.monitoring,
    ...(partialPrefs.monitoring ?? {}),
    activePanelId:
      typeof partialPrefs.monitoring?.activePanelId == "string"
        ? partialPrefs.monitoring.activePanelId
        : partialPrefs.monitoring?.activePanelId === null
          ? null
          : defaults.monitoring.activePanelId,
    volume: parseVolume(
      partialPrefs.monitoring?.volume,
      defaults.monitoring.volume ?? 0.7,
    ),
  };

  const filterProfiles =
    partialPrefs.scanner?.filterProfiles &&
    partialPrefs.scanner.filterProfiles.length
      ? normalizeFilterProfiles(partialPrefs.scanner.filterProfiles)
      : normalizeFilterProfiles(defaults.scanner.filterProfiles);

  const removedSignals = cleanStringArray(
    partialPrefs.scanner?.removedSignals ?? defaults.scanner.removedSignals,
    MAX_REMOVED_SIGNALS,
  );

  const mutedSignals = cleanStringArray(
    partialPrefs.scanner?.mutedSignals ?? defaults.scanner.mutedSignals,
  );

  const scannerPrefs = {
    ...defaults.scanner,
    ...(partialPrefs.scanner ?? {}),
    filterProfiles,
    activeProfileId:
      typeof partialPrefs.scanner?.activeProfileId == "string"
        ? partialPrefs.scanner.activeProfileId
        : (filterProfiles[0]?.id ?? defaults.scanner.activeProfileId),
    removedSignals,
    mutedSignals,
    volume: parseVolume(
      partialPrefs.scanner?.volume,
      defaults.scanner.volume ?? 0.75,
    ),
  };

  const audioInput = partialPrefs.audio;
  const audioPrefs = {
    ...defaults.audio,
    ...(typeof audioInput == "object" && audioInput !== null ? audioInput : {}),
    masterVolume: parseVolume(
      typeof audioInput == "object" && audioInput !== null
        ? audioInput.masterVolume
        : defaults.audio.masterVolume,
      defaults.audio.masterVolume,
    ),
  };

  return {
    launches: launchesPrefs,
    monitoring: monitoringPrefs,
    scanner: scannerPrefs,
    audio: audioPrefs,
  };
};

/**
 * Merge profundo de duas versoes de preferencias.
 */
const deepMergePreferences = (current, updates) =>
  mergeWithDefaults({
    ...current,
    ...updates,
    launches: {
      ...current.launches,
      ...(updates.launches ?? {}),
    },
    monitoring: {
      ...current.monitoring,
      ...(updates.monitoring ?? {}),
    },
    scanner: {
      ...current.scanner,
      ...(updates.scanner ?? {}),
      filterProfiles:
        updates.scanner?.filterProfiles ??
        normalizeFilterProfiles(current.scanner.filterProfiles),
    },
    audio: {
      ...current.audio,
      ...(updates.audio ?? {}),
    },
  });

/* ---- Cache e API ---- */

let cachedPreferences = null;
let loadingPromise = null;

/**
 * Carrega preferencias (localStorage + API), com cache.
 * @param {boolean} forceRefresh - Se true, ignora cache e recarrega
 */
const loadPreferences = async (forceRefresh = false) => {
  if (!forceRefresh && cachedPreferences) return cachedPreferences;
  if (!forceRefresh && loadingPromise) return loadingPromise;

  const fetchPromise = (async () => {
    let preferences = loadFromLocalStorage() ?? getDefaultPreferences();
    try {
      const response = await axiosInstance.get(PREFERENCES_API_ENDPOINT);
      const serverData =
        response.data?.preferences || response.data?.data || response.data;
      if (serverData) {
        preferences = mergeWithDefaults(serverData);
      }
    } catch (error) {
      console.warn(
        "Falha ao carregar preferencias da API, usando cache/local.",
        error,
      );
    }
    cachedPreferences = preferences;
    saveToLocalStorage(preferences);
    return preferences;
  })();

  if (!forceRefresh) {
    loadingPromise = fetchPromise;
    fetchPromise.finally(() => {
      if (loadingPromise === fetchPromise) {
        loadingPromise = null;
      }
    });
  }

  return fetchPromise;
};

/**
 * Salva preferencias (localStorage + API).
 * @param {Object} updates - Campos parciais para atualizar
 */
const savePreferences = async (updates) => {
  const currentPreferences = cachedPreferences ?? (await loadPreferences());
  const mergedPreferences = deepMergePreferences(currentPreferences, updates);
  cachedPreferences = mergedPreferences;
  saveToLocalStorage(mergedPreferences);
  try {
    await axiosInstance.put(PREFERENCES_API_ENDPOINT, mergedPreferences);
  } catch (error) {
    console.error("Nao foi possivel salvar preferencias na API", error);
  }
  return mergedPreferences;
};

/* ---- Exports ---- */
export {
  INITIAL_PREFERENCES as D,
  BellIcon as F,
  WS_BASE_URL as M,
  PINS_STORAGE_KEY as P,
  WATCHDOG_TIMEOUT_SECONDS as S,
  WS_SCANNER_URL as a,
  OPPORTUNITY_TYPE_OPTIONS as b,
  DEFAULT_SCANNER_FILTERS as d,
  getDefaultPreferences as g,
  loadPreferences as l,
  savePreferences as s,
};
