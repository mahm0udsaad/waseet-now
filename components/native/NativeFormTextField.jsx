import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { NativeFormRow } from './NativeFormRow';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import { typography } from '@/utils/native/typography';
import { spacing } from '@/utils/native/layout';

/**
 * NativeFormTextField - iOS Settings-style text input row
 *
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.value - Input value
 * @param {Function} props.onChangeText - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.multiline=false] - Allow multiple lines
 * @param {number} [props.numberOfLines=1] - Number of lines for multiline
 * @param {boolean} [props.isLast=false] - Whether this is the last row
 * @param {boolean} [props.required=false] - Whether the field is required
 * @param {boolean} [props.editable=true] - Whether the field is editable
 * @param {Object} [props.style] - Additional styles
 * @param {...any} props - Other TextInput props
 */
export function NativeFormTextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  isLast = false,
  required = false,
  editable = true,
  suffix,
  style,
  ...textInputProps
}) {
  const { colors } = useTheme();
  const { writingDirection } = useTranslation();

  return (
    <NativeFormRow
      isLast={isLast}
      minHeight={multiline ? (style?.minHeight || 100) : 44}
      style={multiline && styles.multilineRow}
    >
      <View style={[styles.container, multiline && styles.multilineContainer]}>
        <Text style={[
          styles.label,
          multiline && styles.multilineLabel,
          { color: colors.text, writingDirection },
        ]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline={multiline}
            numberOfLines={numberOfLines}
            editable={editable}
            style={[
              styles.input,
              multiline && styles.multilineInput,
              { color: colors.text, textAlign: writingDirection === 'rtl' ? 'right' : 'left', writingDirection },
              !editable && { opacity: 0.5 },
              style,
            ]}
            {...textInputProps}
          />
          {suffix && (
            <View style={[styles.suffixBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.suffixText, { color: colors.textSecondary }]}>{suffix}</Text>
            </View>
          )}
        </View>
      </View>
    </NativeFormRow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  multilineContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  multilineRow: {
    alignItems: 'flex-start',
  },
  label: {
    ...typography.body,
    marginEnd: spacing.md,
  },
  multilineLabel: {
    maxWidth: '100%',
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  input: {
    ...typography.body,
    flex: 1,
  },
  multilineInput: {
    width: '100%',
    marginTop: spacing.sm,
    textAlignVertical: 'top',
  },
  suffixBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginStart: spacing.sm,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NativeFormTextField;
