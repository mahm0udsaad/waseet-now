// @ts-ignore - Deno npm import works at runtime
import { createClient } from "npm:@supabase/supabase-js@2";

// Deno global types
/// <reference lib="deno.ns" />

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface PushNotificationPayload {
  notification_id: string;
  recipient_id: string;
  type?: string;
  conversation_id?: string;
  message_id?: string;
  order_id?: string;
  damin_order_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, unknown>;
  badge: number;
  channelId: string;
  priority: "high";
  image?: string;
}

interface TokenRow {
  expo_push_token: string;
}

// Tokens returning these Expo error codes are permanently unusable and should be deleted
const INVALID_TOKEN_ERRORS = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
  "MismatchSenderId",
]);

// Localized title/body fallback per notification type (Arabic)
function getDefaultTitleBody(type?: string): { title: string; body: string } {
  switch (type) {
    case "message":
      return { title: "رسالة جديدة", body: "رسالة جديدة" };
    case "damin_order_created":
      return { title: "طلب ضامن جديد", body: "تم إضافتك إلى طلب ضامن جديد" };
    case "damin_service_completed":
      return { title: "اكتمل طلب الضامن", body: "تم اكتمال طلب الضامن الخاص بك" };
    case "new_order":
      return { title: "طلب جديد", body: "لديك طلب جديد" };
    case "order_update":
      return { title: "تحديث الطلب", body: "تم تحديث حالة طلبك" };
    case "payment_received":
      return { title: "تم استلام الدفع", body: "تم استلام دفعة جديدة" };
    case "transfer_approved":
      return { title: "تمت الموافقة على التحويل", body: "تمت الموافقة على التحويل البنكي" };
    case "transfer_rejected":
      return { title: "تم رفض التحويل", body: "تم رفض التحويل البنكي" };
    case "order_completion_requested":
      return { title: "طلب إكمال الطلب", body: "يرجى تأكيد إكمال الطلب" };
    case "order_completed":
      return { title: "اكتمل الطلب", body: "تم إكمال الطلب بنجاح" };
    case "admin_notification":
      return { title: "إشعار من الإدارة", body: "لديك رسالة جديدة من إدارة وسيط الآن" };
    case "withdrawal_approved":
      return { title: "تمت الموافقة على طلب السحب", body: "تمت الموافقة على طلب السحب الخاص بك" };
    case "withdrawal_rejected":
      return { title: "تم رفض طلب السحب", body: "تم رفض طلب السحب الخاص بك" };
    default:
      return { title: "إشعار جديد", body: "لديك إشعار جديد" };
  }
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: PushNotificationPayload = await req.json();
    const { recipient_id, type, conversation_id, message_id, order_id, damin_order_id, title, body, data: notifData } = payload;

    if (!recipient_id) {
      return new Response(JSON.stringify({ error: "Missing recipient_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("expo_push_token")
      .eq("user_id", recipient_id);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens", details: tokensError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens found for user ${recipient_id}`);
      return new Response(
        JSON.stringify({ message: "No tokens found for recipient", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve title/body based on notification type
    const defaults = getDefaultTitleBody(type);
    let pushTitle = title || defaults.title;
    let pushBody = body || defaults.body;
    let notificationImage: string | undefined;

    // Enrich with actor info when available
    const { data: notification } = await supabase
      .from("notifications")
      .select("actor_id")
      .eq("id", payload.notification_id)
      .single();

    if (notification?.actor_id) {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", notification.actor_id)
        .maybeSingle();

      if (actorProfile?.display_name && type === "message") {
        // For chat messages, sender name becomes the title
        pushTitle = actorProfile.display_name;
      }

      if (actorProfile?.avatar_url) {
        notificationImage = actorProfile.avatar_url;
      }
    }

    // For message type, fetch actual message content
    if (type === "message" && message_id) {
      const { data: message } = await supabase
        .from("messages")
        .select("content, attachments")
        .eq("id", message_id)
        .maybeSingle();

      if (message) {
        if (message.content) {
          pushBody = message.content;
        } else if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
          const attachment = message.attachments[0];
          if (attachment.type === "image") {
            pushBody = "📷 صورة";
          } else if (attachment.type === "file") {
            pushBody = "📎 ملف";
          } else if (attachment.type === "location") {
            pushBody = "📍 موقع";
          } else {
            pushBody = "📎 مرفق";
          }
        }
      }
    }

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", recipient_id)
      .is("read_at", null);

    const badgeCount = unreadCount ?? 1;

    const pushMessages: ExpoPushMessage[] = tokens.map((tokenRow: TokenRow) => ({
      to: tokenRow.expo_push_token,
      sound: "default",
      title: pushTitle,
      body: pushBody,
      data: {
        type,
        conversation_id,
        message_id,
        order_id,
        damin_order_id,
        ...notifData,
      },
      badge: badgeCount,
      channelId: "default",
      priority: "high",
      ...(notificationImage && { image: notificationImage }),
    }));

    const pushResponse = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(pushMessages),
    });

    const pushResult = await pushResponse.json();

    console.log("Push notification sent:", {
      recipient_id,
      type,
      tokens_count: tokens.length,
      result: pushResult,
    });

    // Detect invalid tokens and delete them so they stop consuming future attempts
    const invalidTokens: string[] = [];
    if (Array.isArray(pushResult?.data)) {
      pushResult.data.forEach((ticket: any, idx: number) => {
        if (ticket?.status === "error") {
          const errorCode = ticket?.details?.error;
          const badToken = tokens[idx]?.expo_push_token;
          if (errorCode && INVALID_TOKEN_ERRORS.has(errorCode) && badToken) {
            invalidTokens.push(badToken);
          }
        }
      });
    }

    if (invalidTokens.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_push_tokens")
        .delete()
        .in("expo_push_token", invalidTokens);

      if (deleteError) {
        console.error("Failed to delete invalid tokens:", deleteError);
      } else {
        console.log(`Deleted ${invalidTokens.length} invalid token(s)`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications sent",
        sent: tokens.length,
        invalid_tokens_removed: invalidTokens.length,
        result: pushResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-message-push:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
