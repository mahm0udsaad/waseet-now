import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { Colors, resolveThemeColors } from '@/constants/theme';

const THEME_KEY = 'app-theme';
const getSystemScheme = () => Appearance.getColorScheme() ?? 'light';

export const useThemeStore = create((set, get) => ({
  themePreference: 'system',
  theme: getSystemScheme(),
  colors: Colors[getSystemScheme()],
  appearanceSubscription: null,

  setTheme: async (themePreference) => {
    const { theme, colors } = resolveThemeColors(themePreference, getSystemScheme());
    await SecureStore.setItemAsync(THEME_KEY, themePreference);
    set({ themePreference, theme, colors });
  },

  toggleTheme: async () => {
    const currentTheme = get().theme;
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    await get().setTheme(nextTheme);
  },

  initTheme: async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_KEY);
      const themePreference =
        savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
          ? savedTheme
          : 'system';
      const { theme, colors } = resolveThemeColors(themePreference, getSystemScheme());
      const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
        const preference = get().themePreference;
        if (preference !== 'system') return;
        const resolved = resolveThemeColors('system', colorScheme ?? 'light');
        set({ theme: resolved.theme, colors: resolved.colors });
      });

      const previousSubscription = get().appearanceSubscription;
      previousSubscription?.remove?.();

      set({ themePreference, theme, colors, appearanceSubscription });
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  },
}));

export const useTheme = () => {
  const { themePreference, theme, colors, setTheme, toggleTheme } = useThemeStore();
  return {
    theme,
    themePreference,
    colors,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
};
