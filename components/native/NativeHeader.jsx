import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativePressable } from './NativePressable';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import { typography } from '@/utils/native/typography';
import { spacing } from '@/utils/native/layout';
import { useRouter } from 'expo-router';

/**
 * NativeHeader - Platform-aware header with blur background (iOS)
 * 
 * @param {Object} props
 * @param {string} props.title - Header title
 * @param {boolean} [props.showBack=false] - Show back button
 * @param {Function} [props.onBack] - Custom back handler (defaults to router.back())
 * @param {React.ReactNode} [props.rightAction] - Right action component
 * @param {boolean} [props.largeTitle=false] - Use large title style (iOS)
 * @param {boolean} [props.transparent=false] - Transparent background (no blur)
 * @param {Object} [props.style] - Additional styles
 */
export function NativeHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  largeTitle = false,
  transparent = false,
  style,
}) {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const HeaderContainer = transparent ? View : (Platform.OS === 'ios' ? BlurView : View);
  const blurProps = transparent || Platform.OS !== 'ios' 
    ? {} 
    : { 
        intensity: 95, 
        tint: isDark ? 'dark' : 'light',
      };

  return (
    <HeaderContainer
      style={[
        styles.container,
        { paddingTop: insets.top },
        !transparent && Platform.OS !== 'ios' && { backgroundColor: colors.surface },
        style,
      ]}
      {...blurProps}
    >
      <View style={[
        styles.content,
        !transparent && styles.contentWithBorder,
        { borderBottomColor: colors.border }
      ]}>
        {/* Start Action (Back button) */}
        <View style={styles.leftAction}>
          {showBack && (
            <NativePressable
              onPress={handleBack}
              haptic="tap"
              style={styles.backButton}
            >
              <NativeIcon
                name="right"
                size="md"
                color={colors.primary}
              />
              {Platform.OS === 'ios' && (
                <Text style={[styles.backText, { color: colors.primary }]}>
                  {isRTL ? "عودة" : "Back"}
                </Text>
              )}
            </NativePressable>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text
            style={[
              largeTitle ? styles.largeTitle : styles.title,
              { color: colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* End Action */}
        <View style={styles.rightAction}>
          {rightAction}
        </View>
      </View>
    </HeaderContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  contentWithBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftAction: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightAction: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
  },
  largeTitle: {
    ...typography.largeTitle,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    ...typography.body,
  },
});

export default NativeHeader;

