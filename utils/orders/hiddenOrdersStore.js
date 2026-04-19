import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Per-device view-state for the user's orders list.
 *
 * This is purely a UX concern — NOTHING here touches the database. Order rows
 * remain untouched in Postgres; we only track which IDs the user wants hidden
 * ("deleted from view") or moved aside ("archived") on this installation.
 *
 * Arrays (not Sets) are used so zustand-persist can JSON-serialize cleanly.
 */
export const useHiddenOrdersStore = create(
  persist(
    (set, get) => ({
      archivedIds: [],
      deletedIds: [],

      isArchived: (id) => get().archivedIds.includes(id),
      isDeleted: (id) => get().deletedIds.includes(id),

      archive: (id) =>
        set((s) => ({
          archivedIds: s.archivedIds.includes(id)
            ? s.archivedIds
            : [...s.archivedIds, id],
          deletedIds: s.deletedIds.filter((x) => x !== id),
        })),

      unarchive: (id) =>
        set((s) => ({
          archivedIds: s.archivedIds.filter((x) => x !== id),
        })),

      // Hide an order from the user's list forever (view-only; DB is untouched).
      deleteFromView: (id) =>
        set((s) => ({
          deletedIds: s.deletedIds.includes(id)
            ? s.deletedIds
            : [...s.deletedIds, id],
          archivedIds: s.archivedIds.filter((x) => x !== id),
        })),

      restore: (id) =>
        set((s) => ({
          archivedIds: s.archivedIds.filter((x) => x !== id),
          deletedIds: s.deletedIds.filter((x) => x !== id),
        })),

      clearAll: () => set({ archivedIds: [], deletedIds: [] }),
    }),
    {
      name: "kafel:hidden-orders:v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
