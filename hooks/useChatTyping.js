import { useCallback, useEffect, useRef, useState } from "react";
import { createTypingChannel, trackTyping, removeTypingChannel } from "@/utils/supabase/chat";

const TYPING_TIMEOUT_MS = 3000;

export function useChatTyping(conversationId, currentUserId) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef(null);
  const timeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    channelRef.current = createTypingChannel(conversationId, currentUserId, setIsOtherTyping);

    return () => {
      removeTypingChannel(channelRef.current);
      channelRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [conversationId, currentUserId]);

  const notifyTyping = useCallback(() => {
    if (!channelRef.current) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      trackTyping(channelRef.current, true);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      trackTyping(channelRef.current, false);
    }, TYPING_TIMEOUT_MS);
  }, []);

  return { isOtherTyping, notifyTyping };
}
