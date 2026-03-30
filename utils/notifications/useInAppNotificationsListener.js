import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "@/utils/supabase/client";
import { fetchMyNotifications, subscribeToMyNotifications } from "@/utils/supabase/notifications";
import { useInAppNotificationsStore } from "./inAppStore";
import { useTranslation } from "@/utils/i18n/store";
import { getLocalizedNotificationContent } from "./formatNotification";

async function scheduleInAppNotificationSound({ title, body }) {
  // Delay expo-notifications module access until after startup completes.
  // On iOS 26 release builds, touching this TurboModule too early can crash.
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "",
        body: body || "",
        sound: "notification.wav",
      },
      trigger: { type: "timeInterval", seconds: 1 },
    });
  } catch (_error) {
    // Best-effort only. Notification sound must never affect app stability.
  }
}

export function useInAppNotificationsListener(enabled = true) {
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
    if (!enabled) return;

    let mounted = true;

    const startSubscription = (userId) => {
      // Tear down any previous subscription
      unsubRef.current?.();
      unsubRef.current = null;

      if (!userId) {
        setNotifications([]);
        return;
      }

      // initial load
      fetchMyNotifications({ limit: 30 })
        .then((data) => { if (mounted) setNotifications(data); })
        .catch(() => {}); // don't block app on notification errors

      // realtime subscription
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

        scheduleInAppNotificationSound({
          title: localized.title,
          body: localized.body,
        });
      });
    };

    // Subscribe to auth changes — reconnect notifications on login, tear down on logout
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          startSubscription(null);
        } else if (session?.user?.id) {
          startSubscription(session.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
      authSub?.unsubscribe();
    };
  }, [addNotification, enabled, setNotifications, showToast]);

  // Helper: mark conversation notifications read when you navigate to a chat
  useEffect(() => {
    if (!enabled) return;

    const markIfChat = async () => {
      // Chat routes:
      // - /chat (alias)
      // - /chats/chat (tabs)
      if (!(pathname?.includes("/chats/chat") || pathname === "/chat")) return;
      // We don't have params here, so the chat screen should call markConversationNotificationsRead itself.
    };
    markIfChat();
  }, [enabled, pathname, router]);
}
