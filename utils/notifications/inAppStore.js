import { create } from "zustand";

export const useInAppNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  toast: null, // { id, title, body }

  setNotifications: (notifications) => {
    const list = Array.isArray(notifications) ? notifications : [];
    const unreadCount = list.filter((n) => !n.read_at).length;
    set({ notifications: list, unreadCount });
  },

  addNotification: (notification) => {
    if (!notification?.id) return;
    const prev = get().notifications || [];
    if (prev.some((n) => n.id === notification.id)) return;
    const next = [notification, ...prev].slice(0, 100);
    set({ notifications: next, unreadCount: next.filter((n) => !n.read_at).length });
  },

  markConversationReadLocal: (conversationId) => {
    const prev = get().notifications || [];
    const next = prev.map((n) =>
      n.conversation_id === conversationId && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
    );
    set({ notifications: next, unreadCount: next.filter((n) => !n.read_at).length });
  },

  markNotificationRead: (notificationId) => {
    const prev = get().notifications || [];
    const next = prev.map((n) =>
      n.id === notificationId && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
    );
    set({ notifications: next, unreadCount: next.filter((n) => !n.read_at).length });
  },

  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));

// Standalone helper so callers can import { showToast } directly
export const showToast = (toast) =>
  useInAppNotificationsStore.getState().showToast(toast);
