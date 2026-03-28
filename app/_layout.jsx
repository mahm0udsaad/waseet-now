import 'react-native-gesture-handler';
import CustomSplashScreen from '@/components/CustomSplashScreen';
import InAppToast from '@/components/InAppToast';
import { loadCommissionSettings } from '@/constants/commissionConfig';
import { getPreferredFontFamily } from '@/constants/theme';
import { useAuth } from '@/utils/auth/useAuth';
import { useLanguageStore } from '@/utils/i18n/store';
import { hasCompletedOnboarding } from '@/utils/onboarding/store';
import {
  configureNotificationHandler,
  getExpoPushToken,
  setupAndroidNotificationChannel,
} from '@/utils/notifications/push';
import { getNotificationRoute } from '@/utils/notifications/routing';
import { useInAppNotificationsListener } from '@/utils/notifications/useInAppNotificationsListener';
import { getMyProfile } from '@/utils/supabase/profile';
import { getSupabaseSession, supabase } from '@/utils/supabase/client';
import { upsertMyPushToken } from '@/utils/supabase/pushTokens';
import { setGlobalFontFamily } from '@/utils/theme/applyGlobalFont';
import { useThemeStore } from '@/utils/theme/store';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>حدث خطأ غير متوقع</Text>
          <Text style={errorStyles.subtitle}>An unexpected error occurred</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={errorStyles.button}
          >
            <Text style={errorStyles.buttonText}>إعادة المحاولة / Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1A2F',
    padding: 40,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#F2F5FA', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#9AA4B2', marginBottom: 24, textAlign: 'center' },
  button: {
    backgroundColor: '#D83A3A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function useProtectedRoute() {
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const isResolvingRef = useRef(false);

  // Keep ref in sync so resolveRoute always reads current segments
  // without needing segments as a dependency (which caused routing loops)
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const resolveRoute = useCallback(async (currentSession) => {
    // Prevent concurrent calls — onAuthStateChange fires INITIAL_SESSION
    // at the same time as getInitialSession(), causing a double-navigate flash
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;

    try {
      const currentSegment = segmentsRef.current[0];
      const isOnboarding = currentSegment === 'onboarding';
      const isSignIn = currentSegment === 'signin';
      const isRegister = currentSegment === 'register';
      const isOtp = currentSegment === 'otp';
      const isCompleteProfile = currentSegment === 'complete-profile';
      const isPublicRoute = isOnboarding || isSignIn || isRegister || isOtp;

      const onboardingCompleted = await hasCompletedOnboarding();
      if (!onboardingCompleted) {
        if (!isOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }

      if (!currentSession) {
        if (!isPublicRoute) {
          router.replace('/signin');
        }
        return;
      }

      let isProfileComplete = false;
      try {
        const { profile } = await getMyProfile();
        isProfileComplete = profile?.is_profile_complete === true;
      } catch (error) {
        console.warn('[RootLayout] Failed to load profile completeness:', error);
      }

      if (!isProfileComplete) {
        if (!isCompleteProfile) {
          router.replace('/complete-profile');
        }
        return;
      }

      if (isPublicRoute || isCompleteProfile) {
        router.replace('/(tabs)');
      }
    } finally {
      isResolvingRef.current = false;
    }
  }, [router]);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const currentSession = await getSupabaseSession();
        if (!mounted) return;
        await resolveRoute(currentSession);
      } catch (error) {
        console.error('[RootLayout] Initial route resolution failed:', error);
        if (mounted) {
          router.replace('/signin');
        }
      } finally {
        if (mounted) {
          setIsAuthChecked(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes (important for Google sign-in).
    // Skip INITIAL_SESSION — getInitialSession() handles it; processing
    // it here too causes a double-navigate flash on every cold start.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted || event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          router.replace('/signin');
          return;
        }

        await resolveRoute(currentSession);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [resolveRoute, router]);

  return isAuthChecked;
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const initTheme = useThemeStore((state) => state.initTheme);
  const initLanguage = useLanguageStore((state) => state.initLanguage);
  const isRTL = useLanguageStore((state) => state.isRTL);
  const colors = useThemeStore((state) => state.colors);
  const [appReady, setAppReady] = useState(false);
  const isAuthChecked = useProtectedRoute();
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();
  const pendingNotificationRouteRef = useRef(null);
  const handledNotificationIdsRef = useRef(new Set());
  useInAppNotificationsListener();
  const startupReady = isReady && appReady && isAuthChecked;

  // Apply a better Arabic UI font globally (best-effort).
  useEffect(() => {
    setGlobalFontFamily(getPreferredFontFamily(isRTL));
  }, [isRTL]);

  // Configure notification handler and setup Android channel
  useEffect(() => {
    configureNotificationHandler();
    setupAndroidNotificationChannel();
  }, []);

  // Register push token when authenticated
  useEffect(() => {
    let mounted = true;

    const registerPushToken = async () => {
      try {
        const session = await getSupabaseSession();
        if (!session || !mounted) return;

        const token = await getExpoPushToken();
        if (token && mounted) {
          await upsertMyPushToken(token);
        }
      } catch (error) {
        console.error("[RootLayout] Failed to register push token:", error);
      }
    };

    registerPushToken();
    return () => {
      mounted = false;
    };
  }, [isReady]);

  // Handle notification taps (when app is closed/background)
  useEffect(() => {
    const handleNotificationResponse = async (response) => {
      if (!response) return;

      const notificationId = response.notification?.request?.identifier;
      if (notificationId && handledNotificationIdsRef.current.has(notificationId)) {
        return;
      }

      const data = response.notification?.request?.content?.data;
      const route = getNotificationRoute(data);
      console.log('[Notification tapped]', data);

      if (notificationId) {
        handledNotificationIdsRef.current.add(notificationId);
      }

      if (!route) return;

      if (startupReady) {
        router.push(route);
      } else {
        pendingNotificationRouteRef.current = route;
      }

      try {
        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) {
        console.warn('[RootLayout] Failed to clear last notification response:', error);
      }
    };

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Notification received]", notification);
      // In-app toast is already handled by useInAppNotificationsListener
    });

    // Listen for user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch((error) => {
        console.warn('[RootLayout] Failed to get last notification response:', error);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, startupReady]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          initiate(),
          initTheme(),
          initLanguage(),
          loadCommissionSettings(),
        ]);
      } catch (error) {
        console.error('[RootLayout] App initialization failed:', error);
      } finally {
        setAppReady(true);
      }
    };
    
    initializeApp();
  }, [initiate, initTheme, initLanguage]);

  useEffect(() => {
    if (startupReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [startupReady]);

  useEffect(() => {
    if (!startupReady || !pendingNotificationRouteRef.current) return;

    const route = pendingNotificationRouteRef.current;
    pendingNotificationRouteRef.current = null;
    router.push(route);
  }, [router, startupReady]);

  if (!startupReady) {
    return <CustomSplashScreen />;
  }

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <InAppToast />
          <Stack
            screenOptions={({ navigation }) => ({
              headerShown: false,
              gestureEnabled: true,
              headerBackButtonDisplayMode: 'minimal',
              headerBackVisible: !isRTL,
              headerShadowVisible: false,
              headerTintColor: colors.text,
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTitleStyle: {
                color: colors.text,
              },
              headerRightContainerStyle: isRTL ? { paddingHorizontal: 8 } : undefined,
              headerRight:
                isRTL && navigation.canGoBack()
                  ? () => (
                      <Pressable
                        onPress={() => navigation.goBack()}
                        style={({ pressed }) => ({
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <ChevronRight size={22} color={colors.text} />
                      </Pressable>
                    )
                  : undefined,
              contentStyle: {
                backgroundColor: colors.background,
              },
            })}
          >
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="otp" options={{ headerShown: false }} />
            <Stack.Screen
              name="complete-profile"
              options={{ title: isRTL ? 'إكمال الملف الشخصي' : 'Complete Profile' }}
            />
            <Stack.Screen
              name="profile/personal"
              options={{
                headerShown: true,
                title: isRTL ? 'المعلومات الشخصية' : 'Personal Info',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="profile/payment"
              options={{
                headerShown: true,
                title: isRTL ? 'طرق الدفع' : 'Payment Methods',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="profile/security"
              options={{
                headerShown: true,
                title: isRTL ? 'الأمان والخصوصية' : 'Security & Privacy',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="profile/help"
              options={{
                headerShown: true,
                title: isRTL ? 'مركز المساعدة' : 'Help Center',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="create-taqib"
              options={{
                headerShown: true,
                title: isRTL ? 'طلب تعقيب' : 'Create Taqib',
                headerLargeTitle: false,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitleVisible: false,
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="create-tanazul"
              options={{
                headerShown: true,
                title: isRTL ? 'إضافة تنازل' : 'Create Tanazul',
                headerLargeTitle: false,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitleVisible: false,
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="create-dhamen"
              options={{
                headerShown: true,
                title: isRTL ? 'طلب ضامن' : 'Create Damin',
                headerLargeTitle: false,
                headerBackVisible: !isRTL,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitleVisible: false,
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="tanazul-list"
              options={{
                headerShown: true,
                title: isRTL ? 'إعلانات التنازل' : 'Tanazul Ads',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="taqib-list"
              options={{
                headerShown: true,
                title: isRTL ? 'إعلانات التعقيب' : 'Taqib Ads',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="notifications"
              options={{
                headerShown: true,
                title: isRTL ? 'الإشعارات' : 'Notifications',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="taqib-ad-details"
              options={{
                headerShown: true,
                title: isRTL ? 'تفاصيل الإعلان' : 'Ad Details',
                headerLargeTitle: false,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitleVisible: false,
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="taqib-details"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="tanazul-details"
              options={{
                headerShown: true,
                title: isRTL ? 'تفاصيل التنازل' : 'Tanazul Details',
                headerLargeTitle: false,
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitleVisible: false,
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="chat"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="wallet"
              options={{
                headerShown: true,
                title: isRTL ? 'المحفظة' : 'Wallet',
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="wallet-transactions"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="wallet-withdraw"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="order-details"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="damin-order-details"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="damin-terms"
              options={{ title: isRTL ? 'شروط الضامن' : 'Damin Terms' }}
            />
            <Stack.Screen
              name="paymob-checkout"
              options={{
                title: isRTL ? 'إتمام الدفع' : 'Checkout',
                gestureEnabled: false,
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="payment-modal"
              options={{
                presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
                headerShown: false,
                title: isRTL ? 'الدفع' : 'Payment',
              }}
            />
          </Stack>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
