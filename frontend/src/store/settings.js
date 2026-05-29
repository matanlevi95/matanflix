// Local user preferences persisted with AsyncStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const KEY = "mytv.settings";

const DEFAULT_BACKEND =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  "http://10.0.2.2:8000";

export const DEFAULT_SETTINGS = {
  quality: "auto", // 'auto' | '1080p' | '720p' | '480p'
  subtitleLang: "he", // 'he' | 'none'
  backendUrl: DEFAULT_BACKEND,
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("saveSettings failed", e);
  }
}
