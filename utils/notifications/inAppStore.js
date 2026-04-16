import { create } from "zustand";

const chatUnread = (list) =>
  list.filter((n) => !n.read_at && n.conversation_id).length;

export const useInAppNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  toast: null, // { id, title, body }

  setNotifications: (notifications) => {
    const list = Array.isArray(notifications) ? notifications : [];
    set({ notifications: list, unreadCount: chatUnread(list) });
  },

  addNotification: (notification) => {
    if (!notification?.id) return;
    const prev = get().notifications || [];
    if (prev.some((n) => n.id === notification.id)) return;
    const next = [notification, ...prev].slice(0, 100);
    set({ notifications: next, unreadCount: chatUnread(next) });
  },

  markConversationReadLocal: (conversationId) => {
    const prev = get().notifications || [];
    const next = prev.map((n) =>
      n.conversation_id === conversationId && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
    );
    set({ notifications: next, unreadCount: chatUnread(next) });
  },

  markNotificationRead: (notificationId) => {
    const prev = get().notifications || [];
    const next = prev.map((n) =>
      n.id === notificationId && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
    );
    set({ notifications: next, unreadCount: chatUnread(next) });
  },

  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));

// Standalone helper so callers can import { showToast } directly
export const showToast = (toast) =>
  useInAppNotificationsStore.getState().showToast(toast);
