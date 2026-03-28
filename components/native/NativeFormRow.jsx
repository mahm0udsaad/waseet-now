import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/utils/theme/store';
import { spacing, hairlineWidth, formRowHeight } from '@/utils/native/layout';

/**
 * NativeFormRow - iOS Settings-style form row
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Row content
 * @param {boolean} [props.isLast=false] - Whether this is the last row (no border)
 * @param {number} [props.minHeight] - Minimum row height
 * @param {Object} [props.style] - Additional styles
 */
export function NativeFormRow({
  children,
  isLast = false,
  minHeight = formRowHeight,
  style,
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        { minHeight },
        !isLast && styles.rowWithBorder,
        !isLast && { borderBottomColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowWithBorder: {
    borderBottomWidth: hairlineWidth,
  },
});

export default NativeFormRow;

