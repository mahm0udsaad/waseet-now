import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeFormRow } from './NativeFormRow';
import { NativePressable } from './NativePressable';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, pickRTLValue } from '@/utils/i18n/store';
import { typography } from '@/utils/native/typography';
import { spacing } from '@/utils/native/layout';

/**
 * NativeFormSelectorRow - iOS Settings-style selector row (opens bottom sheet)
 * 
 * @param {Object} props
 * @param {string} props.label - Selector label
 * @param {string} [props.value] - Selected value text
 * @param {string} [props.placeholder] - Placeholder when no value selected
 * @param {Function} props.onPress - Press handler (opens bottom sheet)
 * @param {boolean} [props.isLast=false] - Whether this is the last row
 * @param {boolean} [props.required=false] - Whether the field is required
 * @param {boolean} [props.disabled=false] - Whether the selector is disabled
 * @param {string} [props.icon] - Optional icon name
 * @param {Object} [props.style] - Additional styles
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
  const { isRTL } = useTranslation();

  return (
    <NativePressable
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      testID={testID}
    >
      <NativeFormRow isLast={isLast} style={style}>
        <View style={[styles.container, { flexDirection: getRTLRowDirection(isRTL) }]}>
          <View style={[styles.labelContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
            {icon && (
              <NativeIcon
                name={icon}
                size="sm"
                color={colors.textSecondary}
                style={[styles.icon, isRTL ? { marginLeft: 0, marginRight: spacing.sm } : { marginLeft: spacing.sm }]}
              />
            )}
            <Text style={[styles.label, { color: colors.text }]}>
              {label}
              {required && <Text style={{ color: colors.error }}> *</Text>}
            </Text>
          </View>
          
          <View style={[styles.valueContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Text
              style={[
                styles.value,
                !value && styles.placeholder,
                { color: value ? colors.text : colors.textMuted },
                isRTL ? { marginLeft: spacing.xs } : { marginRight: spacing.xs }
              ]}
              numberOfLines={1}
            >
              {value || placeholder || 'اختر'}
            </Text>
            
            <NativeIcon
              name={pickRTLValue(isRTL, "left", "right")}
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
    marginLeft: spacing.sm,
  },
  label: {
    ...typography.body,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  value: {
    ...typography.body,
    marginRight: spacing.xs,
  },
  placeholder: {
    fontWeight: '400',
  },
  chevron: {
    opacity: 0.5,
  },
});

export default NativeFormSelectorRow;
