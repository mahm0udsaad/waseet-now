import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { NativePressable } from './NativePressable';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '@/utils/theme/store';
import { typography } from '@/utils/native/typography';
import { spacing, borderRadius } from '@/utils/native/layout';

/**
 * NativeButton - Native-styled button component with haptic feedback
 * 
 * @param {Object} props
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Press handler
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'} [props.variant='primary'] - Button variant
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Whether to show loading spinner
 * @param {string} [props.icon] - Icon name (optional)
 * @param {'left'|'right'} [props.iconPosition='left'] - Icon position
 * @param {Object} [props.style] - Additional styles
 * @param {Object} [props.textStyle] - Additional text styles
 */
export function NativeButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  ...props
}) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'ghost':
        return colors.text;
      case 'outline':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 36,
        };
      case 'md':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          minHeight: 44,
        };
      case 'lg':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xxl,
          minHeight: 52,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          minHeight: 44,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return typography.subheadline;
      case 'md':
        return typography.body;
      case 'lg':
        return typography.headline;
      default:
        return typography.body;
    }
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const textColor = getTextColor();

  return (
    <NativePressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic="confirm"
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <NativeIcon
                name={icon}
                size={iconSize}
                color={textColor}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.text, getTextSize(), { color: textColor }, textStyle]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <NativeIcon
                name={icon}
                size={iconSize}
                color={textColor}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </View>
    </NativePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginEnd: spacing.sm,
  },
  iconRight: {
    marginStart: spacing.sm,
  },
});

export default NativeButton;

