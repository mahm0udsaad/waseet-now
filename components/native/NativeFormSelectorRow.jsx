import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeFormRow } from './NativeFormRow';
import { NativePressable } from './NativePressable';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '@/utils/theme/store';

import { typography } from '@/utils/native/typography';
import { spacing } from '@/utils/native/layout';

/**
 * NativeFormSelectorRow - iOS Settings-style selector row (opens bottom sheet)
 *
 * RTL is handled automatically by I18nManager — flexDirection: 'row' auto-flips,
 * marginStart/marginEnd auto-flip. Only the chevron icon needs manual flipping.
 */
export function NativeFormSelectorRow({
  label,
  value,
  placeholder,
  onPress,
  isLast = false,
  required = false,
  disabled = false,
  icon,
  style,
  testID,
}) {
  const { colors } = useTheme();

  return (
    <NativePressable
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      testID={testID}
    >
      <NativeFormRow isLast={isLast} style={style}>
        <View style={styles.container}>
          <View style={styles.labelContainer}>
            {icon && (
              <NativeIcon
                name={icon}
                size="sm"
                color={colors.textSecondary}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, { color: colors.text }]}>
              {label}
              {required && <Text style={{ color: colors.error }}> *</Text>}
            </Text>
          </View>

          <View style={styles.valueContainer}>
            <Text
              style={[
                styles.value,
                !value && styles.placeholder,
                { color: value ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {value || placeholder || 'اختر'}
            </Text>

            <NativeIcon
              name="left"
              size="sm"
              color={colors.textSecondary}
              style={styles.chevron}
            />
          </View>
        </View>
      </NativeFormRow>
    </NativePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginEnd: spacing.sm,
  },
  label: {
    ...typography.body,
    flexShrink: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: spacing.md,
    flexShrink: 1,
  },
  value: {
    ...typography.body,
    marginEnd: spacing.xs,
    flexShrink: 1,
  },
  placeholder: {
    fontWeight: '400',
  },
  chevron: {
    opacity: 0.5,
  },
});

export default NativeFormSelectorRow;
