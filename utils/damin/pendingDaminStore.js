import { create } from 'zustand';

export const usePendingDaminStore = create((set) => ({
  order: null,
  onConfirm: null,
  onReject: null,
  refreshPending: null,

  openPendingDamin: ({ order, onConfirm, onReject, refreshPending }) =>
    set({ order, onConfirm, onReject, refreshPending }),

  clearPendingDamin: () =>
    set({ order: null, onConfirm: null, onReject: null, refreshPending: null }),
}));
