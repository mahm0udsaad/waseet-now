import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const defaultProjectGroupId = 'create-anything';
const rawProjectGroupId =
  typeof process.env.EXPO_PUBLIC_PROJECT_GROUP_ID === 'string' &&
  process.env.EXPO_PUBLIC_PROJECT_GROUP_ID.trim().length > 0
    ? process.env.EXPO_PUBLIC_PROJECT_GROUP_ID.trim()
    : defaultProjectGroupId;

const projectGroupId = rawProjectGroupId.replace(/[^A-Za-z0-9._-]/g, '-');

export const authKey = `${projectGroupId}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    const persist = auth
      ? SecureStore.setItemAsync(authKey, JSON.stringify(auth))
      : SecureStore.deleteItemAsync(authKey);

    persist.catch((error) => {
      if (__DEV__) {
        console.warn('Failed to persist auth state.', error);
      }
    });

    set({ auth });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: 'signup',
  open: (options) => set({ isOpen: true, mode: options?.mode || 'signup' }),
  close: () => set({ isOpen: false }),
}));
