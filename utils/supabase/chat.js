import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { ensureSupabaseSession, supabase } from "./client";

const CHAT_BUCKET = "chat";

async function buildSignedUrl(path) {
  const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl;
}

async function hydrateAttachments(attachments = []) {
  return Promise.all(
    attachments.map(async (attachment) => {
      try {
        // Handle receipt attachments (use pdf_path for signing)
        if (attachment.type === "receipt" && attachment.pdf_path) {
          const signedUrl = await buildSignedUrl(attachment.pdf_path);
          return { ...attachment, signedUrl, path: attachment.pdf_path };
        }

        // Never rely on stored signed URLs (they expire). If we have a storage path, we always (re)sign.
        if (!attachment?.path || (attachment.type !== "image" && attachment.type !== "file")) {
          return attachment;
        }
        const signedUrl = await buildSignedUrl(attachment.path);
        return { ...attachment, signedUrl };
      } catch (e) {
        // If signing fails (e.g. network issue), pass attachment through without a signed URL
        console.warn("[hydrateAttachments] Failed to sign attachment, skipping:", e?.message);
        return attachment;
      }
    })
  );
}

// 10 MB limit for chat attachments
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "heic", "heif",
  // Documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt",
  // Archives
  "zip", "rar",
]);

async function uploadChatAttachment(userId, attachment) {
  if (!attachment?.uri || (attachment.type !== "image" && attachment.type !== "file")) {
    // passthrough non-file attachments (e.g., location)
    return attachment;
  }

  const extension = (attachment.name || attachment.uri)?.split(".").pop()?.toLowerCase() || "bin";

  // Validate file extension to prevent arbitrary file uploads
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`File type .${extension} is not allowed`);
  }

  // Check file size before uploading
  const fileInfo = await FileSystem.getInfoAsync(attachment.uri, { size: true });
  if (fileInfo.size && fileInfo.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit`);
  }

  const objectPath = `${userId}/chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  // Read file as base64 using expo-file-system (works on React Native)
  const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
    encoding: "base64",
  });

  // Convert base64 to ArrayBuffer for Supabase upload
  const arrayBuffer = decode(base64);

  const contentType = attachment.mimeType || getMimeType(extension);

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (error) throw error;

  const result = {
    type: attachment.type,
    path: objectPath,
    name: attachment.name || objectPath.split("/").pop(),
    mimeType: contentType,
  };
  if (attachment.type === "image" && attachment.width && attachment.height) {
    result.width = attachment.width;
    result.height = attachment.height;
  }
  return result;
}

function getMimeType(extension) {
  const mimeTypes = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

export async function fetchConversations() {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  // Step 1: Get all conversation IDs for current user
  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const conversationIds = (memberships || []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  // Steps 2-6: Run all independent queries in parallel
  const [convResult, membersResult, ordersResult, unreadResult] = await Promise.all([
    // Step 2: Fetch conversations with their last message
    supabase
      .from("conversations")
      .select(`
        id,
        type,
        ad_id,
        created_at,
        messages (
          id,
          sender_id,
          content,
          attachments,
          created_at
        )
      `)
      .in("id", conversationIds)
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { foreignTable: "messages" }),

    // Step 3: Batch-fetch ALL members for these conversations
    supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds),

    // Step 5: Batch-fetch latest order status per conversation
    supabase
      .from("orders")
      .select("id, conversation_id, status")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),

    // Step 6: Batch-fetch unread notification counts per conversation
    supabase
      .from("notifications")
      .select("conversation_id")
      .eq("recipient_id", userId)
      .neq("actor_id", userId)
      .is("read_at", null)
      .in("conversation_id", conversationIds),
  ]);

  if (convResult.error) throw convResult.error;
  const conversations = convResult.data;

  if (membersResult.error) {
    console.error("Error fetching all members:", membersResult.error);
  }
  const allMembers = membersResult.data;

  // Build map: conversationId -> otherUserId
  const otherUserMap = new Map();
  for (const m of allMembers || []) {
    if (m.user_id !== userId) {
      otherUserMap.set(m.conversation_id, m.user_id);
    }
  }

  // Step 4: Batch-fetch ALL other user profiles in ONE query (depends on members result)
  const otherUserIds = [...new Set(otherUserMap.values())];
  const profileMap = new Map();
  if (otherUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", otherUserIds);

    if (!profilesError && profiles) {
      for (const p of profiles) {
        profileMap.set(p.user_id, p);
      }
    }
  }

  const orderStatusMap = new Map();
  if (!ordersResult.error && ordersResult.data) {
    for (const o of ordersResult.data) {
      if (!orderStatusMap.has(o.conversation_id)) {
        orderStatusMap.set(o.conversation_id, o.status);
      }
    }
  }

  const unreadCountMap = new Map();
  const unreadNotifs = unreadResult.data;

  for (const n of unreadNotifs || []) {
    if (n.conversation_id) {
      unreadCountMap.set(n.conversation_id, (unreadCountMap.get(n.conversation_id) || 0) + 1);
    }
  }

  // Step 7: Assemble results (pure mapping, no async)
  const result = (conversations || []).map((conv) => {
    const lastMessage = conv.messages?.[0] || null;
    const otherUserId = otherUserMap.get(conv.id) || null;
    const profile = otherUserId ? profileMap.get(otherUserId) : null;

    return {
      id: conv.id,
      type: conv.type || "dm",
      adId: conv.ad_id || null,
      otherUserId,
      name: conv.type === "group" ? "Group chat" : (profile?.display_name || "User"),
      avatar: profile?.avatar_url || null,
      isOnline: false,
      lastMessage,
      lastMessageAt: lastMessage?.created_at || conv.created_at,
      orderStatus: orderStatusMap.get(conv.id) || null,
      unreadCount: unreadCountMap.get(conv.id) || 0,
    };
  });

  // Dedupe: if DB already has multiple "generic" DMs (adId = null) with the same other user,
  // show only the newest one in the list.
  const deduped = [];
  const bestByKey = new Map();
  for (const row of result) {
    const isGenericDm = row?.type === "dm" && !row?.adId && !!row?.otherUserId;
    const key = isGenericDm ? `dm:generic:${row.otherUserId}` : `conv:${row?.id}`;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, row);
      continue;
    }
    const existingTime = Date.parse(existing.lastMessageAt || existing.created_at) || 0;
    const nextTime = Date.parse(row.lastMessageAt || row.created_at) || 0;
    if (nextTime >= existingTime) bestByKey.set(key, row);
  }
  for (const v of bestByKey.values()) deduped.push(v);

  deduped.sort((a, b) => (Date.parse(b.lastMessageAt) || 0) - (Date.parse(a.lastMessageAt) || 0));

  return deduped;
}

export async function fetchMessages(conversationId, { limit = 30, before, onHydrated } = {}) {
  await ensureSupabaseSession();
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Return messages immediately (newest at bottom for UI)
  const messages = (data || []).reverse();

  // Hydrate signed URLs in the background if callback provided
  if (onHydrated) {
    Promise.all(
      messages.map(async (message) => ({
        ...message,
        attachments: await hydrateAttachments(message.attachments || []),
      }))
    ).then(onHydrated).catch((e) => console.warn("[fetchMessages] Background hydration failed:", e?.message));
  }

  return messages;
}

export async function sendMessage(conversationId, content, attachments = [], { replyToId } = {}) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const uploadedAttachments = [];
  for (const attachment of attachments) {
    uploadedAttachments.push(await uploadChatAttachment(userId, attachment));
  }

  const row = {
    conversation_id: conversationId,
    sender_id: userId,
    content: content || null,
    attachments: uploadedAttachments,
  };
  if (replyToId) row.reply_to_id = replyToId;

  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    attachments: await hydrateAttachments(data.attachments || []),
  };
}

export function subscribeToMessages(conversationId, onInsert, onUpdate) {
  if (!conversationId) {
    console.warn("[subscribeToMessages] No conversationId provided");
    return () => {};
  }

  const channelName = `messages-${conversationId}`;

  // Remove any existing channel with the same name first to avoid duplicates
  const existingChannel = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        try {
          const hydrated = {
            ...payload.new,
            attachments: await hydrateAttachments(payload.new.attachments || []),
          };
          onInsert?.(hydrated);
        } catch (e) {
          console.warn("[subscribeToMessages] Hydration failed, delivering raw message:", e?.message);
          onInsert?.(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        try {
          const hydrated = {
            ...payload.new,
            attachments: await hydrateAttachments(payload.new.attachments || []),
          };
          onUpdate?.(hydrated);
        } catch (e) {
          console.warn("[subscribeToMessages] UPDATE hydration failed:", e?.message);
          onUpdate?.(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[subscribeToMessages] Subscribed to ${channelName}`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // Avoid `console.error` here: RN will show a red "Console Error" overlay even for transient channel errors.
        const msg = err?.message || err?.toString?.() || null;
        console.warn(
          `[subscribeToMessages] Subscription issue for ${channelName} (${status})${msg ? `: ${msg}` : ""}`
        );
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToConversationMembership(userId, onInsert) {
  if (!userId) {
    console.warn("[subscribeToConversationMembership] No userId provided");
    return () => {};
  }

  const channelName = `conversation-members-${userId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
      (payload) => {
        onInsert?.(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[subscribeToConversationMembership] Subscribed to ${channelName}`);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // Avoid `console.error` here: RN will show a red "Console Error" overlay even for transient channel errors.
        const msg = err?.message || err?.toString?.() || null;
        console.warn(
          `[subscribeToConversationMembership] Subscription issue (${status})${msg ? `: ${msg}` : ""}`
        );
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Create (or return) a DM conversation between the current user and `otherUserId`.
 *
 * IMPORTANT: With the current RLS policy on `conversation_members`, a client cannot insert the other user's membership row.
 * This MUST be done server-side via a SECURITY DEFINER function (RPC) like `public.create_dm_conversation(other_user_id uuid)`.
 *
 * Returns: { conversation_id }
 */
export async function createDmConversation(otherUserId) {
  if (!otherUserId) throw new Error("Missing otherUserId");
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("create_dm_conversation", {
    other_user_id: otherUserId,
  });

  if (error) {
    // Provide a more actionable error for local/dev setups where the RPC doesn't exist yet.
    const hint =
      String(error?.message || "").toLowerCase().includes("function") ||
      String(error?.message || "").toLowerCase().includes("rpc")
        ? "Missing Supabase RPC `create_dm_conversation`. Add it in your database (see `supabase/schema.sql`)."
        : null;
    const e = new Error(hint ? `${error.message} — ${hint}` : error.message);
    e.cause = error;
    throw e;
  }

  // RPC with `returns table(...)` returns an array of rows; extract the first row.
  const row = Array.isArray(data) ? data[0] : data;
  const conversationId =
    typeof row === "string"
      ? row
      : row?.conversation_id || row?.id || null;

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Failed to create conversation — unexpected RPC response");
  }

  return { conversation_id: conversationId };
}

/**
 * Create (or return) a DM conversation between the current user and `otherUserId` for a specific ad.
 * This enables per-ad conversations rather than a single DM reused across all ads.
 *
 * Returns: { conversation_id }
 */
export async function createAdDmConversation(otherUserId, adId) {
  if (!otherUserId) throw new Error("Missing otherUserId");
  if (!adId) throw new Error("Missing adId");
  await ensureSupabaseSession();

  const { data, error } = await supabase.rpc("create_ad_dm_conversation", {
    other_user_id: otherUserId,
    ad_id: adId,
  });

  if (error) {
    const hint =
      String(error?.message || "").toLowerCase().includes("function") ||
      String(error?.message || "").toLowerCase().includes("rpc")
        ? "Missing Supabase RPC `create_ad_dm_conversation`. Add it in your database."
        : null;
    const e = new Error(hint ? `${error.message} — ${hint}` : error.message);
    e.cause = error;
    throw e;
  }

  // RPC with `returns table(...)` returns an array of rows; extract the first row.
  const row = Array.isArray(data) ? data[0] : data;
  const conversationId =
    typeof row === "string"
      ? row
      : row?.conversation_id || row?.id || null;

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Failed to create ad conversation — unexpected RPC response");
  }

  return { conversation_id: conversationId };
}

// ── Typing Presence ──

export function createTypingChannel(conversationId, currentUserId, onTypingChange) {
  if (!conversationId || !currentUserId) return null;

  const channelName = `typing-${conversationId}`;

  const channel = supabase.channel(channelName, { config: { presence: { key: currentUserId } } });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const othersTyping = Object.keys(state).some(
        (key) => key !== currentUserId && state[key]?.some((p) => p.typing)
      );
      onTypingChange(othersTyping);
    })
    .subscribe();

  return channel;
}

export function trackTyping(channel, isTyping) {
  if (!channel) return;
  channel.track({ typing: isTyping });
}

export function removeTypingChannel(channel) {
  if (!channel) return;
  channel.untrack();
  supabase.removeChannel(channel);
}

