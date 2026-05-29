// Thin REST client for the MyTV backend.
// On Android emulator the host machine is reachable at 10.0.2.2.
// The base URL is configurable at runtime from the Settings screen.
import Constants from "expo-constants";

const FALLBACK = "http://10.0.2.2:8000";

let API_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  FALLBACK;

export function setApiBase(url) {
  if (url && typeof url === "string") {
    API_BASE = url.replace(/\/+$/, ""); // strip trailing slash
  }
}

export function getApiBase() {
  return API_BASE;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`API error ${path}:`, e.message);
    throw e;
  }
}

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export const api = {
  health: () => request("/api/health"),
  clearCache: () => request("/api/cache/clear", { method: "POST" }),

  // --- metadata ---
  home: () => request("/api/metadata/home"),
  search: (query, type = "all") =>
    request(`/api/metadata/search?${qs({ query, type })}`),
  details: (mediaType, id) => request(`/api/metadata/tmdb/${mediaType}/${id}`),
  seasons: (id) => request(`/api/metadata/tv/${id}/seasons`),

  // --- sources ---
  sourceSearch: (body) =>
    request("/api/sources/search", { method: "POST", body: JSON.stringify(body) }),
  streamUrl: (source, videoId) =>
    request(`/api/sources/stream?${qs({ source, video_id: videoId })}`),

  // --- subtitles ---
  findSubtitles: (title, hash) =>
    request(`/api/subtitles/find?${qs({ title, hash })}`),
  subtitleLink: (fileId) =>
    request(`/api/subtitles/download?${qs({ file_id: fileId })}`),

  // --- watchlist ---
  favorites: () => request("/api/watchlist"),
  addFavorite: (item) =>
    request("/api/watchlist/add", { method: "POST", body: JSON.stringify(item) }),
  removeFavorite: (mediaType, id) =>
    request(`/api/watchlist/remove?${qs({ media_type: mediaType, tmdb_id: id })}`, {
      method: "POST",
    }),
  favoriteStatus: (mediaType, id) =>
    request(`/api/watchlist/status?${qs({ media_type: mediaType, tmdb_id: id })}`),

  // --- watch history ---
  continueWatching: () => request("/api/watch-history/continue"),
  watchHistory: () => request("/api/watch-history"),
  updateWatch: (item) =>
    request("/api/watch-history", { method: "POST", body: JSON.stringify(item) }),
  episodeProgress: (id) => request(`/api/watch-history/episodes/${id}`),
};
