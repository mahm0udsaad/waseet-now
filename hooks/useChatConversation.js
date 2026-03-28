import { useInAppNotificationsStore } from "@/utils/notifications/inAppStore";
import {
  createAdDmConversation,
  createDmConversation,
  fetchMessages,
  subscribeToMessages,
  sendMessage as supabaseSendMessage,
} from "@/utils/supabase/chat";
import { getSupabaseUser } from "@/utils/supabase/client";
import { markConversationNotificationsRead } from "@/utils/supabase/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export function useChatConversation(params, t, isRTL) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null);
  const [adContext, setAdContext] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      return [];
    }

    markConversationReadLocal(conversationId);
    markConversationNotificationsRead(conversationId).catch(() => {});

    const data = await fetchMessages(conversationId);
    setMessages(data);
    setHasMore(data.length >= 30);
    return data;
  }, [conversationId, markConversationReadLocal]);
  
  const markConversationReadLocal = useInAppNotificationsStore(
    (s) => s.markConversationReadLocal
  );
  // Resolve current user + conversation id
  useEffect(() => {
    let isMounted = true;

    const resolve = async () => {
      const user = await getSupabaseUser();
      const uid = user?.id;
      if (isMounted) setCurrentUserId(uid);

      // Priority 1: route param 'id' or 'conversationId'
      const routeConversationId = Array.isArray(params.id)
        ? params.id[0]
        : params.id || (Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId);
      if (routeConversationId) {
        if (isMounted) setConversationId(routeConversationId);
        return;
      }

      const ownerId = Array.isArray(params.ownerId)
        ? params.ownerId[0]
        : params.ownerId;
      if (!uid || !ownerId) {
        if (isMounted) setConversationId(null);
        return;
      }

      if (uid === ownerId) {
        if (isMounted) setConversationId(null);
        return;
      }

      try {
        // Priority 2: If adId is present, create per-ad conversation
        const adId = Array.isArray(params.adId) ? params.adId[0] : params.adId;
        let conversation_id;
        if (adId) {
          ({ conversation_id } = await createAdDmConversation(ownerId, adId));
        } else {
          // Fallback: create generic DM
          ({ conversation_id } = await createDmConversation(ownerId));
        }
        if (isMounted) setConversationId(conversation_id);
      } catch (e) {
        const message =
          e?.message ||
          (isRTL
            ? "تعذر إنشاء المحادثة. تحقق من إعدادات الخادم."
            : "Failed to create chat. Check backend setup.");
        Alert.alert(t.common.error, message);
        if (isMounted) setConversationId(null);
      }
    };

    resolve();
    return () => {
      isMounted = false;
    };
  }, [params.id, params.conversationId, params.ownerId, params.adId, isRTL, t.common.error]);

  // Fetch other user's profile for the conversation
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const fetchOtherUserProfile = async () => {
      try {
        const { supabase } = await import("@/utils/supabase/client");

        // Get all members of this conversation
        const { data: members, error: membersError } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);

        if (membersError) {
          console.error("Error fetching conversation members:", membersError);
          return;
        }

        // Find the other user (not current user)
        const otherUserId = (members || [])
          .map((m) => m.user_id)
          .find((id) => id !== currentUserId);

        if (!otherUserId) {
          console.warn("No other user found in conversation");
          return;
        }

        // Fetch other user's profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", otherUserId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          return;
        }

        setOtherUserId(otherUserId);

        if (profile) {
          setOtherUserProfile({
            displayName: profile.display_name || "User",
            avatarUrl: profile.avatar_url,
          });
        } else {
          console.warn("No profile data returned for user:", otherUserId);
        }
      } catch (error) {
        console.error("Error fetching other user profile:", error);
      }
    };

    fetchOtherUserProfile();
  }, [conversationId, currentUserId]);

  // Fetch ad context for this conversation (works even when opening from chat list)
  useEffect(() => {
    if (!conversationId) {
      setAdContext(null);
      return;
    }

    let isMounted = true;

    const fetchAdContext = async () => {
      try {
        const { supabase } = await import("@/utils/supabase/client");

        // Pull ad info via conversations.ad_id FK -> ads
        const { data, error } = await supabase
          .from("conversations")
          .select(
            "ad_id, ads:ads(owner_id, title, description, price, metadata)"
          )
          .eq("id", conversationId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching conversation ad context:", error);
          return;
        }

        const adId = data?.ad_id || null;
        const ad = data?.ads || null;

        if (!adId || !ad) {
          if (isMounted) setAdContext(null);
          return;
        }

        if (!isMounted) return;

        setAdContext({
          adId,
          ownerId: ad.owner_id || null,
          title: ad.title || "",
          description: ad.description || "",
          price: ad.price ?? null,
          metadata: ad.metadata || {},
        });
      } catch (e) {
        console.error("Error fetching conversation ad context:", e);
      }
    };

    fetchAdContext();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // Load messages + subscribe
  useEffect(() => {
    if (!conversationId) {
      setLoadingMessages(false);
      return;
    }

    let unsubscribe;

    const load = async () => {
      setLoadingMessages(true);
      try {
        await refreshMessages();
      } catch (error) {
        const message =
          error?.message ||
          (isRTL ? "تعذر تحميل الرسائل" : "Failed to load messages");
        Alert.alert(t.common.error, message);
      } finally {
        setLoadingMessages(false);
      }
    };

    load();

    // A7: Insert new messages in sorted position (almost always append)
    unsubscribe = subscribeToMessages(
      conversationId,
      // onInsert
      (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          // New messages are almost always the newest — append
          const last = prev[prev.length - 1];
          if (!last || new Date(message.created_at) >= new Date(last.created_at)) {
            return [...prev, message];
          }
          // Rare: out-of-order message — insert in correct position
          const copy = [...prev];
          const idx = copy.findIndex((m) => new Date(m.created_at) > new Date(message.created_at));
          copy.splice(idx === -1 ? copy.length : idx, 0, message);
          return copy;
        });
      },
      // onUpdate — replace existing message in-place (e.g. payment receipt status change)
      (updatedMessage) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === updatedMessage.id);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = updatedMessage;
          return copy;
        });
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [conversationId, isRTL, t.common.error, refreshMessages]);

  // A6: Load older messages (infinite scroll)
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingMoreRef.current || !hasMore) return;
    if (messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const older = await fetchMessages(conversationId, {
        limit: 30,
        before: oldest.created_at,
      });
      if (older.length < 30) setHasMore(false);
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
    } catch (error) {
      console.warn("Failed to load older messages:", error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, messages]);

  // Send message handler
  const handleSendMessage = async (content, attachments) => {
    if (!conversationId) {
      Alert.alert(
        t.common.error,
        isRTL
          ? "المحادثة غير جاهزة بعد. حاول مرة أخرى."
          : "Chat is not ready yet. Please try again."
      );
      return false;
    }
    if (!content.trim() && attachments.length === 0) return false;

    setSending(true);
    try {
      const newMessage = await supabaseSendMessage(
        conversationId,
        content.trim(),
        attachments
      );
      // Dedup: realtime subscription may have already delivered this message
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      return true;
    } catch (error) {
      const message =
        error?.message ||
        (isRTL ? "تعذر إرسال الرسالة" : "Failed to send message");
      Alert.alert(t.common.error, message);
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    currentUserId,
    conversationId,
    messages,
    otherUserProfile,
    otherUserId,
    adContext,
    isAdOwner: !!(currentUserId && adContext?.ownerId && currentUserId === adContext.ownerId),
    loadingMessages,
    sending,
    handleSendMessage,
    hasMore,
    loadingMore,
    loadOlderMessages,
    refreshMessages,
  };
}
