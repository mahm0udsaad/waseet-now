import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativePressable } from './NativePressable';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '@/utils/theme/store';
import { typography } from '@/utils/native/typography';
import { spacing, hairlineWidth, listItemHeight } from '@/utils/native/layout';

/**
 * NativeListItem - Platform-aware list item component
 * 
 * @param {Object} props
 * @param {string} props.title - Item title
 * @param {string} [props.subtitle] - Item subtitle
 * @param {string} [props.leftIcon] - Left icon name
 * @param {string} [props.rightIcon] - Right icon name (default: 'right')
 * @param {React.ReactNode} [props.leftComponent] - Custom left component
 * @param {React.ReactNode} [props.rightComponent] - Custom right component
 * @param {Function} [props.onPress] - Press handler
 * @param {'compact'|'standard'|'large'} [props.size='standard'] - Item size
 * @param {boolean} [props.showBorder=true] - Show bottom border
 * @param {boolean} [props.disabled=false] - Whether the item is disabled
 * @param {Object} [props.style] - Additional styles
 */
export function NativeListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon = 'right',
  leftComponent,
  rightComponent,
  onPress,
  size = 'standard',
  showBorder = true,
  disabled = false,
  style,
}) {
  const { colors } = useTheme();

  const height = listItemHeight[size] || listItemHeight.standard;

  const Content = (
    <View
      style={[
        styles.container,
        { minHeight: height },
        showBorder && styles.containerWithBorder,
        showBorder && { borderBottomColor: colors.border },
        style,
      ]}
    >
      {/* Left */}
      {(leftIcon || leftComponent) && (
        <View style={styles.leftContainer}>
          {leftIcon ? (
            <NativeIcon
              name={leftIcon}
              size="md"
              color={colors.textSecondary}
            />
          ) : (
            leftComponent
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right */}
      {(rightIcon || rightComponent) && (
        <View style={styles.rightContainer}>
          {rightIcon ? (
            <NativeIcon
              name={rightIcon}
              size="sm"
              color={colors.textSecondary}
            />
          ) : (
            rightComponent
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <NativePressable
        onPress={onPress}
        disabled={disabled}
        haptic="tap"
        opacityOnPress={0.5}
        scaleOnPress={1}
      >
        {Content}
      </NativePressable>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  containerWithBorder: {
    borderBottomWidth: hairlineWidth,
  },
  leftContainer: {
    marginEnd: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    marginStart: spacing.md,
  },
  title: {
    ...typography.body,
  },
  subtitle: {
    ...typography.subheadline,
    marginTop: spacing.xs / 2,
  },
});

export default NativeListItem;

