import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'app-theme';

// Light Theme Colors
export const lightColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  primary: '#D83A3A',
  primaryLight: '#FEE2E2',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  statusBar: 'dark',
};

// Dark Theme Colors
export const darkColors = {
  background: '#0A1A2F',
  backgroundSecondary: '#10233D',
  surface: '#10233D',
  surfaceSecondary: '#1A3252',
  text: '#F2F5FA',
  textSecondary: '#9AA4B2',
  textMuted: '#6B7A8F',
  primary: '#D83A3A',
  primaryLight: '#3D1F1F',
  border: 'rgba(154, 164, 178, 0.2)',
  borderLight: 'rgba(154, 164, 178, 0.1)',
  card: '#10233D',
  cardHover: '#1A3252',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  statusBar: 'light',
};

export const useThemeStore = create((set, get) => ({
  theme: 'dark', // 'light' | 'dark'
  colors: darkColors,
  
  setTheme: async (theme) => {
    const colors = theme === 'light' ? lightColors : darkColors;
    await SecureStore.setItemAsync(THEME_KEY, theme);
    set({ theme, colors });
  },
  
  toggleTheme: async () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    await get().setTheme(newTheme);
  },
  
  initTheme: async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        const colors = savedTheme === 'light' ? lightColors : darkColors;
        set({ theme: savedTheme, colors });
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  },
}));

export const useTheme = () => {
  const { theme, colors, setTheme, toggleTheme } = useThemeStore();
  return { theme, colors, setTheme, toggleTheme, isDark: theme === 'dark' };
};

