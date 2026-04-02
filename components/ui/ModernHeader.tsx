import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/utils/theme/store';

import { NativeIcon } from '@/components/native/NativeIcon';
import { Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function ModernHeader({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightActions,
  style,
  transparent = false,
  showBack = false,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const router = useRouter();

  const Container = (Platform.OS === 'ios' && !transparent) ? BlurView : View;
  const containerProps = (Platform.OS === 'ios' && !transparent)
    ? { intensity: 80, tint: isDark ? 'dark' : 'light' }
    : {};

  const backgroundColor = transparent 
    ? 'transparent' 
    : (Platform.OS === 'android' ? colors.surface : 'transparent');

  const handleBack = () => {
    if (onLeftPress) {
      onLeftPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <Container
        {...containerProps}
        style={[
          styles.container,
          { 
            backgroundColor,
            height: 60,
            flexDirection: 'row',
            borderBottomWidth: transparent ? 0 : 0.5,
            borderBottomColor: transparent ? 'transparent' : colors.border,
          },
          style
        ]}
      >
        {/* Left Section (Back or Icon) */}
        <View style={styles.leftSection}>
          {showBack && (
            <Pressable 
              onPress={handleBack} 
              style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <NativeIcon
                name="right"
                size={28}
                color={colors.text}
              />
            </Pressable>
          )}
          {leftIcon && (
            <Pressable 
              onPress={onLeftPress} 
              style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              {leftIcon}
            </Pressable>
          )}
        </View>

        {/* Center Section (Title) */}
        <View style={styles.centerSection}>
          {title && (
            <Text 
              style={[
                styles.title, 
                { color: colors.text }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text 
              style={[
                styles.subtitle, 
                { color: colors.textSecondary }
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section (Actions) */}
        <View style={styles.rightSection}>
          {rightActions}
        </View>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 100,
  },
  container: {
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.s,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  iconButton: {
    padding: 4,
  },
});
