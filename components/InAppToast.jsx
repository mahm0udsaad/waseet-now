import React, { useCallback, useEffect } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { NativeIcon } from '@/components/native/NativeIcon';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { useTranslation } from '@/utils/i18n/store';
import { getNotificationRoute } from '@/utils/notifications/routing';
import { useInAppNotificationsStore } from '@/utils/notifications/inAppStore';
import { useTheme } from '@/utils/theme/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(width - 32, 400);

const ICONS = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
  info: 'info',
  message: 'message-circle',
};

const ACCENTS = {
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FFCC00',
  info: '#007AFF',
  message: '#007AFF',
};

export default function InAppToast() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const toast = useInAppNotificationsStore((s) => s.toast);
  const clearToast = useInAppNotificationsStore((s) => s.clearToast);

  const handleDismiss = useCallback(() => {
    clearToast();
  }, [clearToast]);

  useEffect(() => {
    if (!toast) return undefined;
    const duration = toast.duration || 4000;
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, handleDismiss]);

  const handlePress = () => {
    if (toast?.onAction) {
      toast.onAction();
      handleDismiss();
      return;
    }

    const notifType = (toast?.type || 'info').toLowerCase();
    handleDismiss();

    if (toast?.actionPath) {
      router.push(toast.actionPath);
      return;
    }

    const route = getNotificationRoute({
      type: notifType,
      conversationId: toast?.conversationId,
      orderId: toast?.orderId,
    });

    if (route) {
      router.push(route);
    }
  };

  if (!toast) return null;

  const type = (toast.type || 'info').toLowerCase();
  const normalizedType =
    type.includes('fail') || type.includes('error')
      ? 'error'
      : type.includes('success')
        ? 'success'
        : type.includes('warn')
          ? 'warning'
          : type.includes('message')
            ? 'message'
            : 'info';

  const accentColor = ACCENTS[normalizedType] || ACCENTS.info;
  const iconName = ICONS[normalizedType] || ICONS.info;

  const Container = Platform.OS === 'ios' ? BlurView : View;
  const containerProps =
    Platform.OS === 'ios'
      ? { intensity: 80, tint: isDark ? 'dark' : 'light' }
      : { style: { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' } };

  return (
    <View style={[styles.wrapper, { top: insets.top + Spacing.s }]} pointerEvents="box-none">
      <View style={[styles.animatedContainer, Shadows.large]}>
        <Container
          {...containerProps}
          style={[
            styles.toastContainer,
            { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Pressable
            style={styles.contentContainer}
            onPress={handlePress}
          >
            <View style={[styles.iconWrapper, { backgroundColor: accentColor + '15' }]}>
              <NativeIcon name={iconName} size={24} color={accentColor} />
            </View>

            <View style={[styles.textWrapper, { alignItems: 'flex-start' }]}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.body && (
                <Text
                  style={[styles.body, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {toast.body}
                </Text>
              )}
            </View>

            {toast.actionLabel ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (toast.onAction) toast.onAction();
                  handleDismiss();
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  { opacity: pressed ? 0.7 : 1, backgroundColor: accentColor + '10' },
                ]}
              >
                <Text style={[styles.actionText, { color: accentColor }]}>{toast.actionLabel}</Text>
              </Pressable>
            ) : (
              <View style={styles.grabber} />
            )}
          </Pressable>
        </Container>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedContainer: {
    width: TOAST_WIDTH,
  },
  toastContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 64,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  grabber: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.35)',
  },
});
