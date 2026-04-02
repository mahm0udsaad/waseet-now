import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

// SecureStore adapter for Supabase auth — stores session tokens in the
// device keychain/keystore instead of plaintext AsyncStorage.
const SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storage: SecureStoreAdapter,
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
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.user) {
    cachedSession = sessionData.session;
    return cachedSession;
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

