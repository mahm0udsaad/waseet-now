import * as Haptics from 'expo-haptics';

/**
 * Semantic haptic feedback helpers
 * These provide consistent haptic feedback throughout the app
 */

export const hapticFeedback = {
  /**
   * Light tap feedback for general interactions (list items, toggles, etc.)
   */
  tap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium feedback for confirmations and important selections
   */
  confirm: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Heavy feedback for critical actions
   */
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * Success notification (e.g., form submitted successfully)
   */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Error notification (e.g., validation failed)
   */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * Warning notification
   */
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /**
   * Selection changed feedback (for pickers, segmented controls, etc.)
   */
  selection: () => {
    Haptics.selectionAsync();
  },
};

/**
 * Wraps a function with haptic feedback
 * @param {Function} fn - The function to wrap
 * @param {'tap'|'confirm'|'heavy'|'success'|'error'|'warning'|'selection'} type - The type of haptic feedback
 * @returns {Function} The wrapped function
 */
export const withHaptic = (fn, type = 'tap') => {
  return (...args) => {
    hapticFeedback[type]?.();
    return fn?.(...args);
  };
};

