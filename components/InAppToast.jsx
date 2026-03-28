import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, Pressable, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { NativeIcon } from '@/components/native/NativeIcon'; // Assuming this exists or use vector-icons directly
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { useInAppNotificationsStore } from '@/utils/notifications/inAppStore';
import { getNotificationRoute } from '@/utils/notifications/routing';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';

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
  success: '#34C759', // iOS Green
  error: '#FF3B30',   // iOS Red
  warning: '#FFCC00', // iOS Yellow
  info: '#007AFF',    // iOS Blue
  message: '#007AFF',
};

export default function InAppToast() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const toast = useInAppNotificationsStore((s) => s.toast);
  const clearToast = useInAppNotificationsStore((s) => s.clearToast);

  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const handleDismiss = useCallback(() => {
    clearToast();
  }, [clearToast]);

  // Auto-dismiss
  useEffect(() => {
    if (toast) {
      translateY.value = 0; // Reset position
      const duration = toast.duration || 4000;
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, translateY, handleDismiss]);

  const handlePress = () => {
    // If action is provided, run it
    if (toast?.onAction) {
      toast.onAction();
      handleDismiss();
      return;
    }

    // Default behaviors based on type
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

  const pan = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Allow swiping up to dismiss
      if (event.translationY < 0) {
        translateY.value = event.translationY + context.value.y;
      } else {
         // Resistance when pulling down
         translateY.value = (event.translationY * 0.2) + context.value.y;
      }
    })
    .onEnd((event) => {
      if (translateY.value < -50 || event.velocityY < -500) {
        // Swipe up to dismiss
        runOnJS(clearToast)();
      } else {
        // Spring back
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const type = (toast.type || 'info').toLowerCase();
  // Map 'fail' to 'error' if needed
  const normalizedType = type.includes('fail') || type.includes('error') ? 'error' : 
                         type.includes('success') ? 'success' : 
                         type.includes('warn') ? 'warning' : 
                         type.includes('message') ? 'message' : 'info';

  const accentColor = ACCENTS[normalizedType] || ACCENTS.info;
  const iconName = ICONS[normalizedType] || ICONS.info;

  const Container = Platform.OS === 'ios' ? BlurView : View;
  const containerProps = Platform.OS === 'ios' 
    ? { intensity: 80, tint: isDark ? 'dark' : 'light' }
    : { style: { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' } };

  return (
    <View style={[styles.wrapper, { top: insets.top + Spacing.s }]} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View 
          entering={SlideInUp.springify().mass(0.7).damping(12).stiffness(120)} 
          exiting={SlideOutUp.duration(250)}
          style={[styles.animatedContainer, animatedStyle, Shadows.large]}
        >
          <Container
            {...containerProps}
            style={[
              styles.toastContainer, 
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
          >
            <Pressable 
              style={[styles.contentContainer, { flexDirection: getRTLRowDirection(isRTL) }]}
              onPress={handlePress}
            >
              {/* Icon Section */}
              <View style={[styles.iconWrapper, { backgroundColor: accentColor + '15' }]}>
                <NativeIcon name={iconName} size={24} color={accentColor} />
              </View>

              {/* Text Section */}
              <View style={[styles.textWrapper, { alignItems: getRTLStartAlign(isRTL) }]}>
                <Text style={[styles.title, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]} numberOfLines={1}>
                  {toast.title}
                </Text>
                {toast.body && (
                  <Text style={[styles.body, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]} numberOfLines={2}>
                    {toast.body}
                  </Text>
                )}
              </View>

              {/* Action Button or Close */}
              {toast.actionLabel ? (
                 <Pressable 
                    onPress={(e) => {
                      e.stopPropagation();
                      if (toast.onAction) toast.onAction();
                      handleDismiss();
                    }}
                    style={({pressed}) => [
                      styles.actionButton,
                      { opacity: pressed ? 0.7 : 1, backgroundColor: accentColor + '10' }
                    ]}
                 >
                   <Text style={[styles.actionText, { color: accentColor }]}>{toast.actionLabel}</Text>
                 </Pressable>
              ) : (
                 <View style={styles.grabber} /> 
              )}
            </Pressable>
          </Container>
        </Animated.View>
      </GestureDetector>
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
    borderRadius: BorderRadius.xl, // 20 or similar
    overflow: 'hidden',
    borderWidth: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // iOS feels better with comfortable padding
    minHeight: 64,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22, // Circle
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
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  grabber: {
    // Optional visual cue for swipe/dismiss, but keep it minimal
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128, 0.2)',
    marginHorizontal: 4,
  }
});
