import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { isNetworkError, notifyOffline } from "../debug/isNetworkError";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

// One-time migration: move any pre-existing session out of SecureStore so users
// who upgrade don't get signed out. Runs fire-and-forget at module load.
const LEGACY_SESSION_KEYS = [
  `sb-${(supabaseUrl || "").replace(/^https?:\/\//, "").split(".")[0]}-auth-token`,
  "supabase.auth.token",
];
(async () => {
  try {
    for (const key of LEGACY_SESSION_KEYS) {
      if (!key) continue;
      const existing = await SecureStore.getItemAsync(key).catch(() => null);
      if (existing) {
        const already = await AsyncStorage.getItem(key);
        if (!already) await AsyncStorage.setItem(key, existing);
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    }
  } catch {}
})();

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let cachedSession = null;

function isSessionExpired(session) {
  if (!session?.expires_at) return true;
  // expires_at is a Unix timestamp in seconds
  return Date.now() / 1000 >= session.expires_at;
}

export async function getSupabaseSession() {
  if (cachedSession && !isSessionExpired(cachedSession)) return cachedSession;
  // Clear stale cache so we fetch fresh
  cachedSession = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      cachedSession = sessionData.session;
      return cachedSession;
    }
  } catch (error) {
    // Network failure (AuthRetryableFetchError / "Network request failed") —
    // treat as "no session" so callers route to signin gracefully, and
    // surface a toast so the user knows why sign-in features may fail.
    console.warn("[getSupabaseSession] failed:", error?.message || error);
    if (isNetworkError(error)) notifyOffline();
  }
  return null;
}

export async function ensureSupabaseSession() {
  const session = await getSupabaseSession();
  if (session) return session;
  throw new Error("Not authenticated. Please sign in.");
}

export async function getSupabaseUser() {
  const session = await getSupabaseSession();
  if (!session) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  cachedSession = session;
});

