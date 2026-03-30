import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { hapticFeedback } from '@/utils/native/haptics';
import { getHitSlop } from '@/utils/native/layout';

/**
 * NativePressable - Platform-aware pressable component with haptic feedback
 * 
 * @param {Object} props
 * @param {Function} props.onPress - Press handler
 * @param {React.ReactNode} props.children - Child components
 * @param {'tap'|'confirm'|'heavy'|'selection'|'none'} [props.haptic='tap'] - Haptic feedback type
 * @param {boolean} [props.disabled=false] - Whether the pressable is disabled
 * @param {Object} [props.style] - Style for the pressable
 * @param {number} [props.hitSlop] - Custom hit slop
 * @param {number} [props.scaleOnPress=0.97] - Scale factor when pressed (set to 1 to disable)
 * @param {number} [props.opacityOnPress=0.7] - Opacity when pressed (set to 1 to disable)
 */
export function NativePressable({
  onPress,
  children,
  haptic = 'tap',
  disabled = false,
  style,
  hitSlop,
  scaleOnPress = 0.97,
  opacityOnPress = 0.7,
  ...props
}) {
  const handlePress = (e) => {
    if (!disabled && onPress) {
      // Trigger haptic feedback if specified
      if (haptic && haptic !== 'none' && hapticFeedback[haptic]) {
        hapticFeedback[haptic]();
      }
      onPress(e);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={hitSlop || getHitSlop()}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        pressed && scaleOnPress !== 1 && { transform: [{ scale: scaleOnPress }] },
        pressed && opacityOnPress !== 1 && { opacity: opacityOnPress },
        disabled && styles.disabled,
      ]}
      {...props}
    >
      {typeof children === 'function' 
        ? children 
        : ({ pressed }) => children
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
});

export default NativePressable;

