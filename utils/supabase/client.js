import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let cachedSession = null;

export async function getSupabaseSession() {
  if (cachedSession) return cachedSession;
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

