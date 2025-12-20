import { supabase, ensureSupabaseSession } from "./client";

const CHAT_BUCKET = "chat";

async function buildSignedUrl(path) {
  const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl;
}

async function hydrateAttachments(attachments = []) {
  const hydrated = [];
  for (const attachment of attachments) {
    if (!attachment?.path || attachment.signedUrl || (attachment.type !== "image" && attachment.type !== "file")) {
      hydrated.push(attachment);
      continue;
    }
    const signedUrl = await buildSignedUrl(attachment.path);
    hydrated.push({ ...attachment, signedUrl });
  }
  return hydrated;
}

async function uploadChatAttachment(userId, attachment) {
  if (!attachment?.uri || (attachment.type !== "image" && attachment.type !== "file")) {
    // passthrough non-file attachments (e.g., location)
    return attachment;
  }

  const extension = (attachment.name || attachment.uri)?.split(".").pop() || "bin";
  const objectPath = `${userId}/chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const response = await fetch(attachment.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(objectPath, blob, {
      contentType: attachment.mimeType || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;

  const signedUrl = await buildSignedUrl(objectPath);

  return {
    type: attachment.type,
    path: objectPath,
    name: attachment.name || objectPath.split("/").pop(),
    mimeType: attachment.mimeType,
    signedUrl,
  };
}

export async function fetchConversations() {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations!inner(id, type, created_at),
      messages (
        id,
        sender_id,
        content,
        created_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" });

  if (error) throw error;

  return (data || []).map((item) => {
    const lastMessage = item.messages?.[0];
    return {
      id: item.conversation_id,
      type: item.conversations?.type || "dm",
      name: item.conversations?.type === "group" ? "Group chat" : "Direct chat",
      lastMessage,
    };
  });
}

export async function fetchMessages(conversationId, { limit = 30, before } = {}) {
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

  const hydrated = await Promise.all(
    (data || []).map(async (message) => ({
      ...message,
      attachments: await hydrateAttachments(message.attachments || []),
    }))
  );

  // newest at bottom for UI
  return hydrated.reverse();
}

export async function sendMessage(conversationId, content, attachments = []) {
  const session = await ensureSupabaseSession();
  const userId = session.user.id;

  const uploadedAttachments = [];
  for (const attachment of attachments) {
    uploadedAttachments.push(await uploadChatAttachment(userId, attachment));
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content || null,
      attachments: uploadedAttachments,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToMessages(conversationId, onInsert) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        const hydrated = {
          ...payload.new,
          attachments: await hydrateAttachments(payload.new.attachments || []),
        };
        onInsert?.(hydrated);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

