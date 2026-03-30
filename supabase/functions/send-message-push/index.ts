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
  image?: string; // Notification image (Android large icon, iOS attachment)
}

interface TokenRow {
  expo_push_token: string;
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  try {
    // Verify this is a valid request (from our own database trigger or authenticated user)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the payload
    const payload: PushNotificationPayload = await req.json();
    const { recipient_id, type, conversation_id, message_id, order_id, damin_order_id, title, body, data: notifData } = payload;

    if (!recipient_id) {
      return new Response(JSON.stringify({ error: "Missing recipient_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role (to read tokens)
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active push tokens for the recipient
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

    // Get sender profile and message details for personalized notification
    let senderName = "رسالة جديدة"; // "New message" in Arabic (default)
    let messageContent = body || "رسالة جديدة";
    let notificationImage: string | undefined;
    
    // Try to get actor info and actual message content
    const { data: notification } = await supabase
      .from("notifications")
      .select("actor_id")
      .eq("id", payload.notification_id)
      .single();

    if (notification?.actor_id) {
      // Get sender's profile (name and avatar)
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", notification.actor_id)
        .maybeSingle();

      if (actorProfile?.display_name) {
        senderName = actorProfile.display_name;
      }

      // Use sender's avatar as notification image if available
      if (actorProfile?.avatar_url) {
        notificationImage = actorProfile.avatar_url;
      }
    }

    // Get actual message content if message_id is provided
    if (message_id) {
      const { data: message } = await supabase
        .from("messages")
        .select("content, attachments")
        .eq("id", message_id)
        .maybeSingle();

      if (message) {
        if (message.content) {
          messageContent = message.content;
        } else if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
          // If no text but has attachments
          const attachment = message.attachments[0];
          if (attachment.type === "image") {
            messageContent = "📷 صورة"; // "Image" in Arabic
          } else if (attachment.type === "file") {
            messageContent = "📎 ملف"; // "File" in Arabic
          } else if (attachment.type === "location") {
            messageContent = "📍 موقع"; // "Location" in Arabic
          } else {
            messageContent = "📎 مرفق"; // "Attachment" in Arabic
          }
        }
      }
    }

    // If no sender avatar, use app logo as fallback
    // You can upload logo.png to Supabase Storage and use that URL
    // For now, we'll use the icon from your app
    if (!notificationImage) {
      // This will use the app icon by default on both platforms
      notificationImage = undefined;
    }

    // Count unread notifications for badge
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", recipient_id)
      .is("read_at", null);

    const badgeCount = unreadCount ?? 1;

    // Build push messages
    const pushMessages: ExpoPushMessage[] = tokens.map((tokenRow: TokenRow) => ({
      to: tokenRow.expo_push_token,
      sound: "default",
      title: senderName, // Sender's name
      body: messageContent, // Actual message content
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
      ...(notificationImage && { image: notificationImage }), // Add image if available
    }));

    // Send to Expo Push API
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
      tokens_count: tokens.length,
      result: pushResult,
    });

    // Check for errors in the response
    if (pushResult.data) {
      const errors = pushResult.data.filter(
        (ticket: any) => ticket.status === "error"
      );
      if (errors.length > 0) {
        console.error("Push errors:", errors);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications sent",
        sent: tokens.length,
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

