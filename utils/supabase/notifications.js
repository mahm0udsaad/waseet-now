import { supabase, ensureSupabaseSession } from "./client";

export async function fetchMyNotifications({ limit = 30 } = {}) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export function subscribeToMyNotifications(userId, onInsert) {
  if (!userId) {
    console.warn("[subscribeToMyNotifications] No userId provided");
    return () => {};
  }

  const channelName = `notifications-${userId}`;

  // Remove any existing channel with the same name first to avoid duplicates
  const existingChannel = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[subscribeToMyNotifications] Subscribed to ${channelName}`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // Avoid `console.error` here: RN will show a red "Console Error" overlay even for transient channel errors.
        const msg = err?.message || err?.toString?.() || null;
        console.warn(
          `[subscribeToMyNotifications] Subscription issue (${status})${msg ? `: ${msg}` : ""}`
        );
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markNotificationRead(notificationId) {
  await ensureSupabaseSession();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markConversationNotificationsRead(conversationId) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("conversation_id", conversationId)
    .is("read_at", null);

  if (error) throw error;
}


