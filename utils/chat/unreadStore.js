import { create } from "zustand";

export const useChatUnreadStore = create((set) => ({
  totalUnread: 0,
  setTotalUnread: (n) => set({ totalUnread: Math.max(0, n) }),
  incrementUnread: () => set((s) => ({ totalUnread: s.totalUnread + 1 })),
  decrementUnread: (by = 1) => set((s) => ({ totalUnread: Math.max(0, s.totalUnread - by) })),
}));
