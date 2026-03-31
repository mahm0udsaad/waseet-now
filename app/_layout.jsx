import CustomSplashScreen from '@/components/CustomSplashScreen';
import InAppToast from '@/components/InAppToast';
import { loadCommissionSettings } from '@/constants/commissionConfig';
import { getPreferredFontFamily } from '@/constants/theme';
import { useAuth } from '@/utils/auth/useAuth';
import {
  clearFatalError,
  getFatalError,
  subscribeToFatalError,
} from '@/utils/debug/fatalErrorStore';
import { useLanguageStore } from '@/utils/i18n/store';
import { hasCompletedOnboarding } from '@/utils/onboarding/store';
import {
  configureNotificationHandler,
  getExpoPushToken,
  setupAndroidNotificationChannel,
} from '@/utils/notifications/push';
import { getNotificationRoute } from '@/utils/notifications/routing';
import { useInAppNotificationsListener } from '@/utils/notifications/useInAppNotificationsListener';
import { usePendingDaminOrder } from '@/hooks/usePendingDaminOrder';
import { usePendingDaminStore } from '@/utils/damin/pendingDaminStore';
import { getMyProfile } from '@/utils/supabase/profile';
import { getSupabaseSession, supabase } from '@/utils/supabase/client';
import { upsertMyPushToken } from '@/utils/supabase/pushTokens';
import { setGlobalFontFamily } from '@/utils/theme/applyGlobalFont';
import { useThemeStore } from '@/utils/theme/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
      const err = this.state.error;
      const errMsg = err?.message || String(err || 'Unknown error');
      const errStack = err?.stack || '';
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>حدث خطأ غير متوقع</Text>
          <Text style={errorStyles.subtitle}>An unexpected error occurred</Text>
          <ScrollView style={errorStyles.debugBox} contentContainerStyle={errorStyles.debugContent}>
            <Text style={errorStyles.debugText}>{errMsg}</Text>
            <Text style={errorStyles.debugStack}>{errStack}</Text>
          </ScrollView>
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
  subtitle: { fontSize: 16, color: '#9AA4B2', marginBottom: 12, textAlign: 'center' },
  debugBox: {
    maxHeight: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 12,
    backgroundColor: '#020617',
    marginBottom: 16,
  },
  debugContent: { padding: 12 },
  debugText: { color: '#FEE2E2', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  debugStack: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  button: {
    backgroundColor: '#D83A3A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

function FatalErrorOverlay({ fatalError }) {
  return (
    <View style={fatalErrorStyles.container}>
      <Text style={fatalErrorStyles.title}>Startup JS Fatal Error</Text>
      <Text style={fatalErrorStyles.meta}>
        {fatalError.name} | {fatalError.jsEngine} | {fatalError.platform} {fatalError.platformVersion}
      </Text>
      <Text style={fatalErrorStyles.message}>{fatalError.message}</Text>
      <ScrollView style={fatalErrorStyles.stackBox} contentContainerStyle={fatalErrorStyles.stackContent}>
        <Text style={fatalErrorStyles.stack}>{fatalError.stack || 'No stack available.'}</Text>
      </ScrollView>
      <Pressable onPress={clearFatalError} style={fatalErrorStyles.button}>
        <Text style={fatalErrorStyles.buttonText}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const fatalErrorStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#08111F',
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  meta: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 12,
  },
  message: {
    color: '#FEE2E2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  stackBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 14,
    backgroundColor: '#020617',
  },
  stackContent: {
    padding: 14,
  },
  stack: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#D83A3A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const STARTUP_PROFILE_TIMEOUT_MS = 8000;

function withTimeout(task, timeoutMs, label) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Attach a no-op .catch to the original task so that if it rejects AFTER
  // the timeout wins the race, the rejection doesn't become unhandled.
  Promise.resolve(task).catch(() => {});

  return Promise.race([task, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function useProtectedRoute(canNavigate) {
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  const router = useRouter();
  const routerRef = useRef(router);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const isResolvingRef = useRef(false);

  // Keep refs in sync so callbacks always read current values
  // without needing them as dependencies (which caused routing loops / re-fires)
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

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
          routerRef.current.replace('/onboarding');
        }
        return;
      }

      if (!currentSession) {
        if (!isPublicRoute) {
          routerRef.current.replace('/signin');
        }
        return;
      }

      let profileResult;
      try {
        profileResult = await withTimeout(
          getMyProfile(),
          STARTUP_PROFILE_TIMEOUT_MS,
          'getMyProfile'
        );
      } catch (error) {
        console.warn('[RootLayout] Failed to load profile completeness:', error);
        // Network/transient error — don't misroute to complete-profile.
        // If already on a public route or complete-profile, stay put; otherwise
        // let the user through to the main app (profile will be re-checked later).
        if (isPublicRoute || isCompleteProfile) return;
        routerRef.current.replace('/(tabs)');
        return;
      }

      if (!profileResult?.profile?.is_profile_complete) {
        if (!isCompleteProfile) {
          routerRef.current.replace('/complete-profile');
        }
        return;
      }

      if (isPublicRoute || isCompleteProfile) {
        routerRef.current.replace('/(tabs)');
      }
    } finally {
      isResolvingRef.current = false;
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!canNavigate) return;

    let mounted = true;

    // Get initial session — with a hard timeout so a hanging getSession()
    // can never block startup forever (e.g. AsyncStorage lock contention).
    const getInitialSession = async () => {
      try {
        const currentSession = await withTimeout(
          getSupabaseSession(),
          8000,
          'getSupabaseSession',
        );
        if (!mounted) return;
        await resolveRoute(currentSession);
      } catch (error) {
        console.warn('[RootLayout] Initial route resolution failed:', error?.message || error);
        if (mounted) {
          try { routerRef.current.replace('/signin'); } catch (_) { /* router not ready */ }
        }
      } finally {
        if (mounted) {
          setIsAuthChecked(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes.
    // Skip INITIAL_SESSION — getInitialSession() handles it; processing
    // it here too causes a double-navigate flash on every cold start.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted || event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          routerRef.current.replace('/signin');
          return;
        }

        await resolveRoute(currentSession);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [canNavigate, resolveRoute]);

  return isAuthChecked;
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const initTheme = useThemeStore((state) => state.initTheme);
  const initLanguage = useLanguageStore((state) => state.initLanguage);
  const isRTL = useLanguageStore((state) => state.isRTL);
  const colors = useThemeStore((state) => state.colors);
  const [appReady, setAppReady] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const rootNavigationState = useRootNavigationState();
  // In Expo Router v6 / React Navigation v7, the root state object may
  // exist without a `key` property.  Accept any truthy state that contains
  // at least one route as "ready".
  const navigationReady = !!(rootNavigationState?.key || rootNavigationState?.routes?.length);
  const isAuthChecked = useProtectedRoute(navigationReady);
  const router = useRouter();
  const fatalError = useSyncExternalStore(
    subscribeToFatalError,
    getFatalError,
    getFatalError
  );
  const notificationListener = useRef();
  const responseListener = useRef();
  const pendingNotificationRouteRef = useRef(null);
  const handledNotificationIdsRef = useRef(new Set());
  const splashHiddenRef = useRef(false);
  const splashHideInFlightRef = useRef(false);
  const startupReady = isReady && appReady && isAuthChecked;
  useInAppNotificationsListener(startupReady);
  const {
    pendingOrder: pendingDaminOrder,
    onConfirm: onDaminConfirm,
    onReject: onDaminReject,
    refreshPending: refreshDaminPending,
  } = usePendingDaminOrder(startupReady);

  // When a pending Damin order is detected, populate the store and open the modal
  const daminModalShownRef = useRef(null);
  useEffect(() => {
    if (!pendingDaminOrder) {
      daminModalShownRef.current = null;
      return;
    }
    // Avoid re-opening for the same order
    if (daminModalShownRef.current === pendingDaminOrder.id) return;
    daminModalShownRef.current = pendingDaminOrder.id;

    usePendingDaminStore.getState().openPendingDamin({
      order: pendingDaminOrder,
      onConfirm: onDaminConfirm,
      onReject: onDaminReject,
      refreshPending: refreshDaminPending,
    });
    router.push('/damin-pending-modal');
  }, [pendingDaminOrder, onDaminConfirm, onDaminReject, refreshDaminPending, router]);

  // Diagnose navigation readiness — log once when it changes
  useEffect(() => {
    console.log('[RootLayout] navigationReady:', navigationReady,
      'rootState keys:', rootNavigationState ? Object.keys(rootNavigationState) : 'null');
  }, [navigationReady]);

  // Apply a better Arabic UI font globally (best-effort).
  useEffect(() => {
    setGlobalFontFamily(getPreferredFontFamily(isRTL));
  }, [isRTL]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.style.direction = dir;

    if (document.body) {
      document.body.setAttribute('dir', dir);
      document.body.style.direction = dir;
    }
  }, [isRTL]);

  // Defer ALL notification setup until the app is fully ready.
  // expo-notifications TurboModule throws ObjC exceptions on iOS 26 during early startup,
  // crashing Hermes before JS error handlers can catch them.
  // The module is loaded lazily via dynamic import() to avoid TurboModule init at bundle time.
  useEffect(() => {
    if (!startupReady) return;

    let mounted = true;

    const setup = async () => {
      let Notif;
      try {
        Notif = await import('expo-notifications');
      } catch (e) {
        console.warn('[RootLayout] Failed to load expo-notifications:', e);
        return;
      }

      if (!mounted) return;

      // Configure handler + Android channel
      try { configureNotificationHandler(); } catch (e) { console.warn('[RootLayout] configureNotificationHandler failed:', e); }
      setupAndroidNotificationChannel();

      // Clear badge
      const clearBadge = () => {
        try { Notif.setBadgeCountAsync(0).catch(() => {}); } catch (_error) { /* ignore */ }
      };
      clearBadge();
      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') clearBadge();
      });

      // Register push token
      const registerPushToken = async (session) => {
        if (!session || !mounted) return;
        try {
          const token = await getExpoPushToken();
          if (token && mounted) {
            await upsertMyPushToken(token);
          }
        } catch (error) {
          console.error("[RootLayout] Failed to register push token:", error);
        }
      };

      getSupabaseSession().then((s) => registerPushToken(s)).catch(() => {});

      const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            registerPushToken(session);
          }
        }
      );

      // Notification tap handling
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

        if (!navigationReady) {
          pendingNotificationRouteRef.current = route;
        } else {
          router.push(route);
        }

        try {
          await Notif.clearLastNotificationResponseAsync();
        } catch (error) {
          console.warn('[RootLayout] Failed to clear last notification response:', error);
        }
      };

      try {
        notificationListener.current = Notif.addNotificationReceivedListener((notification) => {
          console.log("[Notification received]", notification);
        });

        responseListener.current = Notif.addNotificationResponseReceivedListener(handleNotificationResponse);

        Notif.getLastNotificationResponseAsync()
          .then(handleNotificationResponse)
          .catch((error) => {
            console.warn('[RootLayout] Failed to get last notification response:', error);
          });
      } catch (e) {
        console.warn('[RootLayout] Notification listeners setup failed:', e);
      }

      // Store cleanup refs for teardown
      cleanupRef.current = () => {
        appStateSub.remove();
        authSub?.unsubscribe();
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    };

    const cleanupRef = { current: null };
    setup();

    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, [navigationReady, startupReady, router]);

  // Hard timeout to prevent infinite splash screen if any initializer hangs
  useEffect(() => {
    if (startupReady) return; // Already started — no failsafe needed

    const failsafe = setTimeout(() => {
      const flags = { isReady, appReady, isAuthChecked, navigationReady };
      console.error('[RootLayout] Startup timed out after 15s — forcing splash hide');
      console.error('[RootLayout] Flags:', JSON.stringify(flags));

      setStartupTimedOut(true);

      // Navigate to a safe fallback route so the user doesn't see a blank screen
      try { router.replace('/signin'); } catch (_e) { /* ignore */ }
    }, 15000);

    return () => clearTimeout(failsafe);
  }, [startupReady]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const results = await Promise.allSettled([
          initiate().then(() => console.log('[Init] initiate done')),
          initTheme().then(() => console.log('[Init] initTheme done')),
          initLanguage().then(() => console.log('[Init] initLanguage done')),
        ]);
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`[Init] Task ${i} failed:`, r.reason);
          }
        });
      } catch (error) {
        console.error('[RootLayout] App initialization failed:', error);
      } finally {
        setAppReady(true);
      }
    };

    initializeApp();
    // Commission settings have safe defaults — load in background without blocking startup
    loadCommissionSettings().catch(() => {});
  }, [initiate, initTheme, initLanguage]);

  useEffect(() => {
    if (!(fatalError || startupReady || startupTimedOut)) return;
    if (splashHiddenRef.current || splashHideInFlightRef.current) return;

    splashHideInFlightRef.current = true;

    SplashScreen.hideAsync()
      .then(() => {
        splashHiddenRef.current = true;
      })
      .catch((error) => {
        const message = String(error?.message || '');
        if (message.includes('No native splash screen registered')) {
          // iOS can report this after presenting another view controller (sheet/browser).
          // At that point there is nothing left to hide, so treat it as already handled.
          splashHiddenRef.current = true;
          return;
        }

        if (__DEV__) {
          console.warn('[RootLayout] SplashScreen.hideAsync failed:', error);
        }
      })
      .finally(() => {
        splashHideInFlightRef.current = false;
      });
  }, [fatalError, startupReady, startupTimedOut]);

  useEffect(() => {
    if (!navigationReady || !startupReady || !pendingNotificationRouteRef.current) return;

    const route = pendingNotificationRouteRef.current;
    pendingNotificationRouteRef.current = null;
    router.push(route);
  }, [navigationReady, router, startupReady]);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
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
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
              headerLeft: isRTL && navigation.canGoBack()
                ? () => (
                    <Pressable
                      onPress={() => navigation.goBack()}
                      hitSlop={8}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                    >
                      <ChevronRight size={24} color={colors.text} />
                    </Pressable>
                  )
                : undefined,
              contentStyle: {
                backgroundColor: colors.background,
              },
            })}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
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
            <Stack.Screen
              name="damin-pending-modal"
              options={{
                presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
                headerShown: false,
                title: isRTL ? 'طلب ضمان' : 'Damin Request',
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                sheetAllowedDetents: [0.65, 0.85],
                sheetExpandsWhenScrolledToEdge: true,
              }}
            />
          </Stack>
          {!(startupReady || startupTimedOut) ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="auto">
              <CustomSplashScreen />
            </View>
          ) : null}
          {fatalError ? <FatalErrorOverlay fatalError={fatalError} /> : null}
      </View>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
