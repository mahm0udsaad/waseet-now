import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { getSupabaseUser } from "@/utils/supabase/client";
import { fetchMyNotifications, subscribeToMyNotifications } from "@/utils/supabase/notifications";
import { useInAppNotificationsStore } from "./inAppStore";
import { useTranslation } from "@/utils/i18n/store";
import { getLocalizedNotificationContent } from "./formatNotification";

export function useInAppNotificationsListener() {
  const { isRTL } = useTranslation();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const isRTLRef = useRef(isRTL);
  const router = useRouter();
  const unsubRef = useRef(null);

  const setNotifications = useInAppNotificationsStore((s) => s.setNotifications);
  const addNotification = useInAppNotificationsStore((s) => s.addNotification);
  const showToast = useInAppNotificationsStore((s) => s.showToast);

  // Keep refs up-to-date without re-creating the subscription
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { isRTLRef.current = isRTL; }, [isRTL]);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      const user = await getSupabaseUser();
      const userId = user?.id;
      if (!userId || !mounted) return;

      // initial load
      try {
        const data = await fetchMyNotifications({ limit: 30 });
        if (mounted) setNotifications(data);
      } catch {
        // don't block app on notification errors
      }

      // realtime subscription
      unsubRef.current?.();
      unsubRef.current = subscribeToMyNotifications(userId, (notif) => {
        addNotification(notif);
        const localized = getLocalizedNotificationContent(notif, isRTLRef.current);

        // If user is already inside the chat, don't toast; we will show messages there.
        const currentPathname = pathnameRef.current;
        const isInChat = currentPathname?.includes("/chats/chat") || currentPathname === "/chat";
        if (isInChat) return;

        // show a lightweight in-app toast — InAppToast handles its own auto-dismiss timer
        showToast({
          id: notif.id,
          title: localized.title || (isRTLRef.current ? "رسالة جديدة" : "New message"),
          body: localized.body || "",
          type: notif.type || "message",
          conversationId: notif.conversation_id,
          orderId: notif.order_id || notif.data?.order_id,
        });

        // Play notification sound via a local notification
        // (shouldShowAlert: false suppresses the banner, shouldPlaySound: true plays the sound)
        Notifications.scheduleNotificationAsync({
          content: {
            title: localized.title || "",
            body: localized.body || "",
            sound: "notification.wav",
          },
          trigger: null, // immediate
        }).catch(() => {}); // best-effort
      });
    };

    start();
    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [addNotification, setNotifications, showToast]);

  // Helper: mark conversation notifications read when you navigate to a chat
  useEffect(() => {
    const markIfChat = async () => {
      // Chat routes:
      // - /chat (alias)
      // - /chats/chat (tabs)
      if (!(pathname?.includes("/chats/chat") || pathname === "/chat")) return;
      // We don't have params here, so the chat screen should call markConversationNotificationsRead itself.
    };
    markIfChat();
  }, [pathname, router]);
}
