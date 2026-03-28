import { supabase } from "@/utils/supabase/client";
import { Buffer } from "safer-buffer";

export function generateFallbackDisplayName() {
  const n = Math.floor(Math.random() * 1000);
  return `User${String(n).padStart(3, "0")}`;
}

export async function getMyUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

export async function getMyProfile() {
  const user = await getMyUser();
  if (!user) return { user: null, profile: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, avatar_url, language, theme, is_profile_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return { user, profile: data ?? null };
}

export async function upsertMyProfile(patch) {
  const user = await getMyUser();
  if (!user) throw new Error("Not authenticated");

  // Prefer update; fall back to insert if missing (should rarely happen due to trigger)
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select("user_id, display_name, email, avatar_url, language, theme, is_profile_complete")
    .maybeSingle();

  if (!updateError && updated) return updated;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, ...patch })
    .select("user_id, display_name, email, avatar_url, language, theme, is_profile_complete")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

export async function uploadMyAvatarFromUri(uri) {
  const user = await getMyUser();
  if (!user) throw new Error("Not authenticated");
  if (!uri) throw new Error("Missing image uri");

  // Fetch the local file into a blob (works in Expo)
  const res = await fetch(uri);
  const blob = await res.blob();

  const extGuess = uri.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  const ext = extGuess && extGuess.length <= 5 ? extGuess : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const contentType = blob?.type || "image/jpeg";
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { publicUrl: data?.publicUrl ?? null, path };
}

export async function uploadMyAvatarFromBase64(base64, mimeType = "image/jpeg", extHint = "jpg") {
  const user = await getMyUser();
  if (!user) throw new Error("Not authenticated");
  if (!base64) throw new Error("Missing base64 image");

  const bytes = Buffer.from(base64, "base64");
  const ext = typeof extHint === "string" && extHint.trim().length > 0 ? extHint.trim().toLowerCase() : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType: mimeType || "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { publicUrl: data?.publicUrl ?? null, path };
}


