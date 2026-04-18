/* ========================================
 * Discord Link Helper Module
 * Audio management + Discord OAuth URL builder
 * ======================================== */

import { J as API_BASE_URL } from "./index-Bx06KCE-.js";
import {
  a as DISCORD_LINK_URL,
  b as DISCORD_AUTH_URL,
  c as DISCORD_CLIENT_ID,
  d as DISCORD_SCOPE,
  e as DISCORD_OAUTH_STATE_STORAGE_KEY,
  f as DISCORD_OAUTH_STATE_COOKIE_KEY,
  g as DISCORD_REDIRECT_URI,
  h as DISCORD_CALLBACK_PATH,
} from "./discord-BL8Te9RE.js";

/* ---- Constants ---- */
const PREFERENCES_STORAGE_KEY = "teamop.preferences.v1";

/* ---- Audio Volume Helpers ---- */

/**
 * Clamp a numeric value between 0 and 1.
 */
const clampVolume = (value) => Math.min(1, Math.max(0, value));

/**
 * Get the master volume from user preferences (localStorage).
 * Falls back to 1 (100%) if not found or invalid.
 */
const getMasterVolume = (cachedPrefs) => {
  if (typeof localStorage > "u") return 1;
  try {
    const volumeValue = (
      cachedPrefs ??
      JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "null")
    )?.audio?.masterVolume;
    if (typeof volumeValue == "number" && Number.isFinite(volumeValue)) return clampVolume(volumeValue);
  } catch {}
  return 1;
};

/**
 * Get the category-specific volume (e.g. 'scanner', 'monitoring', 'launches').
 * Falls back to 1 (100%) if not found or invalid.
 */
const getCategoryVolume = (preferenceKey, cachedPrefs) => {
  if (!preferenceKey || typeof localStorage > "u") return 1;
  try {
    const volumeValue = (cachedPrefs ??
      JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "null"))?.[
      preferenceKey
    ]?.volume;
    if (typeof volumeValue == "number" && Number.isFinite(volumeValue)) return clampVolume(volumeValue);
  } catch {}
  return 1;
};

/**
 * Compute the effective volume: baseVolume * masterVolume * categoryVolume.
 */
const computeEffectiveVolume = (baseVolume, preferenceKey) => {
  let cachedPrefs;
  try {
    cachedPrefs =
      typeof localStorage < "u"
        ? JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "null")
        : null;
  } catch {
    cachedPrefs = null;
  }
  const masterVol = getMasterVolume(cachedPrefs);
  const categoryVol = getCategoryVolume(preferenceKey, cachedPrefs);
  return clampVolume(baseVolume * masterVol * categoryVol);
};

/* ---- Sound Factory ---- */

/**
 * Creates an audio notification object with play/stop/cleanup methods.
 * Supports rate-limiting via minIntervalMs to avoid spamming sounds.
 *
 * @param {string} audioPath - Path to the audio file
 * @param {Object} options - { volume, preferenceKey, minIntervalMs }
 * @returns {{ element, play, stop, cleanup }}
 */
const createSound = (audioPath, options) => {
  if (typeof window > "u" || typeof Audio > "u")
    return {
      element: null,
      play: () => {},
      stop: () => {},
      cleanup: () => {},
    };

  const audioElement = new Audio(audioPath);
  audioElement.preload = "auto";
  audioElement.loop = false;

  const baseVolume = typeof options?.volume == "number" ? options.volume : 0.1;
  audioElement.volume = computeEffectiveVolume(
    baseVolume,
    options?.preferenceKey,
  );

  const minInterval = options?.minIntervalMs ?? 1200;
  let isPlaying = false;
  let isPending = false;
  let lastPlayTime = 0;
  let pendingTimer = null;

  const clearPendingTimer = () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  };

  const schedulePendingPlay = () => {
    clearPendingTimer();
    const elapsed = Date.now() - lastPlayTime;
    const delay = Math.max(minInterval - elapsed, 0);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      playSound();
    }, delay);
  };

  const onAudioEnd = () => {
    isPlaying = false;
    if (isPending) {
      isPending = false;
      schedulePendingPlay();
    }
  };

  const playSound = async () => {
    if (!audioElement) return;
    const now = Date.now();

    if (isPlaying) {
      isPending = true;
      return;
    }
    if (now - lastPlayTime < minInterval) {
      isPending = true;
      schedulePendingPlay();
      return;
    }

    try {
      audioElement.volume = computeEffectiveVolume(
        baseVolume,
        options?.preferenceKey,
      );
      audioElement.currentTime = 0;
      isPlaying = true;
      await audioElement.play();
      lastPlayTime = Date.now();
    } catch (err) {
      isPlaying = false;
      isPending = false;
      console.warn("Erro ao tentar tocar o áudio:", err);
    }
  };

  const stopSound = () => {
    isPending = false;
    isPlaying = false;
    clearPendingTimer();
    audioElement.pause();
    audioElement.currentTime = 0;
  };

  const cleanup = () => {
    stopSound();
    audioElement.removeEventListener("ended", onAudioEnd);
    audioElement.removeEventListener("pause", onAudioEnd);
    audioElement.removeEventListener("error", onAudioEnd);
  };

  audioElement.addEventListener("ended", onAudioEnd);
  audioElement.addEventListener("pause", onAudioEnd);
  audioElement.addEventListener("error", onAudioEnd);

  return {
    element: audioElement,
    play: playSound,
    stop: stopSound,
    cleanup,
  };
};

/* ---- UUID Generator ---- */

/**
 * Generate a unique identifier (uses crypto.randomUUID if available).
 */
const generateUUID = () => {
  return typeof crypto < "u" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/* ---- Discord OAuth Helpers ---- */

/**
 * Resolve the redirect URI for Discord OAuth.
 * Priority: DISCORD_REDIRECT_URI > API_BASE_URL + callback path > window.location.origin + callback path
 */
const resolveRedirectUri = () => {
  const configuredUri = DISCORD_REDIRECT_URI?.trim();
  if (configuredUri) return configuredUri;

  const apiBase = API_BASE_URL?.trim();
  if (apiBase) {
    return `${apiBase.replace(/\/$/, "")}/auth/discord/callback`;
  }

  if (typeof window < "u") {
    return `${window.location.origin}${DISCORD_CALLBACK_PATH}`;
  }
  return "";
};

/**
 * Build the full Discord OAuth authorization URL with the given state parameter.
 * Tries DISCORD_LINK_URL first, falls back to building URL from DISCORD_AUTH_URL.
 *
 * @param {string} state - The OAuth state value for CSRF protection
 * @returns {string|null} The full Discord authorization URL, or null if not possible
 */
const buildDiscordAuthUrl = (state) => {
  if (typeof window > "u") return null;

  const redirectUri = resolveRedirectUri();
  const linkUrl = DISCORD_LINK_URL?.trim();

  /* Try pre-configured link URL first */
  if (linkUrl)
    try {
      const url = new URL(linkUrl, window.location.origin);
      if (!url.searchParams.has("redirect_uri") && redirectUri)
        url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      return url.toString();
    } catch (err) {
      console.warn("Invalid DISCORD_LINK_URL", err);
    }

  if (!redirectUri) return null;

  /* Build URL from DISCORD_AUTH_URL + params */
  let authUrl;
  try {
    authUrl = new URL(DISCORD_AUTH_URL, window.location.origin);
  } catch (err) {
    console.warn("Invalid DISCORD_AUTH_URL, using default", err);
    authUrl = new URL("https://discord.com/oauth2/authorize");
  }

  authUrl.searchParams.set("client_id", DISCORD_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", DISCORD_SCOPE);
  authUrl.searchParams.set("state", state);

  return authUrl.toString();
};

/**
 * Store the OAuth state in both localStorage and a cookie (10 min TTL).
 * This allows verification on the callback regardless of which storage is available.
 */
const storeOAuthState = (state) => {
  const expires = new Date(Date.now() + 6e5).toUTCString();
  try {
    window.localStorage.setItem(DISCORD_OAUTH_STATE_STORAGE_KEY, state);
    document.cookie = `${DISCORD_OAUTH_STATE_COOKIE_KEY}=${state}; path=/; expires=${expires}; SameSite=Lax`;
  } catch (err) {
    console.warn("Nao foi possivel armazenar o state do Discord", err);
  }
};

/* ---- Exports ---- */
export {
  buildDiscordAuthUrl as b,
  createSound as c,
  generateUUID as g,
  storeOAuthState as p,
};
