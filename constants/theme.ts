import { Platform } from 'react-native';

export const lightColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceHighlight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  primary: '#D83A3A',
  primaryLight: '#FEE2E2',
  secondary: '#0F172A',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  shadow: 'rgba(15, 23, 42, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.5)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  icon: '#64748B',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#D83A3A',
  tint: '#D83A3A',
  statusBar: 'dark' as const,
};

export const darkColors = {
  background: '#0A1A2F',
  backgroundSecondary: '#10233D',
  surface: '#10233D',
  surfaceSecondary: '#1A3252',
  surfaceHighlight: '#1A3252',
  text: '#F2F5FA',
  textSecondary: '#9AA4B2',
  textMuted: '#6B7A8F',
  primary: '#D83A3A',
  primaryLight: '#3D1F1F',
  secondary: '#F2F5FA',
  border: 'rgba(154, 164, 178, 0.2)',
  borderLight: 'rgba(154, 164, 178, 0.1)',
  card: '#10233D',
  cardHover: '#1A3252',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  icon: '#9AA4B2',
  tabIconDefault: '#6B7A8F',
  tabIconSelected: '#D83A3A',
  tint: '#D83A3A',
  statusBar: 'light' as const,
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export type AppThemeName = keyof typeof Colors;
export type ThemePreference = AppThemeName | 'system';

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  small: {
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const SCREEN_MAX_WIDTH = 760;

export function resolveThemeColors(themePreference: ThemePreference, systemScheme?: AppThemeName | null) {
  const resolvedTheme: AppThemeName =
    themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;

  return {
    theme: resolvedTheme,
    colors: Colors[resolvedTheme],
  };
}

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Times New Roman',
    rounded: 'System', 
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const ArabicFontFamily = Platform.select({
  ios: 'Al Nile',
  android: 'sans-serif',
  default: undefined,
  web: "'Tajawal', 'Cairo', 'Noto Kufi Arabic', 'Noto Naskh Arabic', system-ui, sans-serif",
});

export function getPreferredFontFamily(isRTL: boolean) {
  return isRTL ? ArabicFontFamily : undefined;
}
