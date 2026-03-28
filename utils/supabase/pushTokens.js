import { supabase, ensureSupabaseSession } from "./client";
import { Platform } from "react-native";
import * as Device from "expo-device";

/**
 * Upsert the current device's Expo push token
 */
export async function upsertMyPushToken(expoPushToken) {
  if (!expoPushToken) {
    console.warn("[upsertMyPushToken] No token provided");
    return;
  }

  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const platform = Platform.OS;
  const deviceId = Device.modelId || Device.deviceName || "unknown";

  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform,
        device_id: deviceId,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,expo_push_token",
      }
    );

  if (error) {
    console.error("[upsertMyPushToken] Error:", error);
    throw error;
  }

  console.log("[upsertMyPushToken] Token registered successfully");
}

/**
 * Delete a specific push token (e.g., on logout or token invalidation)
 */
export async function deleteMyPushToken(expoPushToken) {
  if (!expoPushToken) return;

  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("expo_push_token", expoPushToken);

  if (error) {
    console.error("[deleteMyPushToken] Error:", error);
    throw error;
  }

  console.log("[deleteMyPushToken] Token removed successfully");
}

/**
 * Delete all push tokens for the current user (e.g., on logout)
 */
export async function deleteAllMyPushTokens() {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[deleteAllMyPushTokens] Error:", error);
    throw error;
  }

  console.log("[deleteAllMyPushTokens] All tokens removed successfully");
}

