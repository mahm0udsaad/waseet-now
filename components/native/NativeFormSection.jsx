import { borderRadius, spacing } from '@/utils/native/layout';
import { typography } from '@/utils/native/typography';
import { useTheme } from '@/utils/theme/store';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * NativeFormSection - iOS Settings-style grouped section
 *
 * @param {Object} props
 * @param {string} [props.title] - Section title (header)
 * @param {string} [props.footer] - Section footer text
 * @param {React.ReactNode} props.children - Form rows
 * @param {Object} [props.style] - Additional styles
 */
export function NativeFormSection({
  title,
  footer,
  children,
  style,
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.headerWrapper}>
          <Text style={[styles.header, { color: colors.textSecondary }]}>
            {title}
          </Text>
        </View>
      )}

      <View style={[styles.content, { backgroundColor: colors.surface }]}>
        {React.Children.map(children, (child, index) => {
          if (!child) return null;

          const isLast = index === React.Children.count(children) - 1;

          return React.cloneElement(child, {
            ...child.props,
            isLast,
          });
        })}
      </View>

      {footer && (
        <View style={styles.footerWrapper}>
          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            {footer}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  headerWrapper: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  header: {
    ...typography.caption1,
    fontWeight: '600',
  },
  content: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  footerWrapper: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  footer: {
    ...typography.footnote,
    lineHeight: 18,
  },
});

export default NativeFormSection;
