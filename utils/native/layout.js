import { Platform } from 'react-native';

/**
 * Native layout constants and spacing tokens
 * Based on iOS Human Interface Guidelines and Material Design
 */

// Minimum tap target size (44pt for iOS, 48dp for Android)
export const MIN_HIT_SLOP = Platform.OS === 'ios' ? 44 : 48;

// Standard spacing scale (in points/dp)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Standard border radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

// Hairline width (for separators)
export const hairlineWidth = Platform.select({
  ios: 0.5,
  android: 1,
  default: 1,
});

// Standard icon sizes
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
};

// Form row height (iOS Settings-style)
export const formRowHeight = 44;

// List item height
export const listItemHeight = {
  compact: 44,
  standard: 56,
  large: 72,
};

// Safe area insets (default fallback values)
export const safeAreaInsets = {
  top: Platform.OS === 'ios' ? 44 : 0,
  bottom: Platform.OS === 'ios' ? 34 : 0,
  left: 0,
  right: 0,
};

/**
 * Get consistent hit slop for touch targets
 * @param {number} size - Optional custom size
 * @returns {Object} Hit slop object
 */
export const getHitSlop = (size = MIN_HIT_SLOP) => {
  const slop = Math.max(0, (size - MIN_HIT_SLOP) / 2);
  return { top: slop, bottom: slop, left: slop, right: slop };
};

