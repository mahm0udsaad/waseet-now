import { NativeIcon } from '@/components/native/NativeIcon';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useLanguage } from '@/utils/i18n/store';
import { useTheme } from '@/utils/theme/store';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
            <NativeIcon name="question" size={36} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {isRTL ? 'تعذر العثور على هذه الصفحة' : 'This screen could not be found'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isRTL
              ? 'قد يكون الرابط غير صالح أو أن المحتوى لم يعد متاحاً.'
              : 'The link may be invalid, or the content is no longer available.'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isRTL ? 'العودة للرئيسية' : 'Go to Home'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
                router.replace('/');
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {isRTL ? 'رجوع' : 'Go Back'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.l,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.s,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.s,
    marginTop: Spacing.xl,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.m,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.m,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
