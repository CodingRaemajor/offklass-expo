import AsyncStorage from "@react-native-async-storage/async-storage";
const k = (s: string) => `offklass:${s}`;

export type OnboardingData = {
  name: string;
  language: string;   // "English", "नेपाली", ...
  grade: string; // "Grade 3".
  school: string;
};

export async function saveJSON(key: string, v: unknown) {
  await AsyncStorage.setItem(k(key), JSON.stringify(v));
}
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const ONBOARD_KEY = "onboard";