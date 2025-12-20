import { useAuth } from '@/utils/auth/useAuth';
import { useLanguageStore } from '@/utils/i18n/store';
import { getSupabaseSession, supabase } from '@/utils/supabase/client';
import { useThemeStore } from '@/utils/theme/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

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
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSupabaseSession();
      const inAuthGroup = segments[0] === '(auth)';
      const isOnboarding = segments[0] === 'onboarding';
      const isSignIn = segments[0] === 'signin';
      const isRegister = segments[0] === 'register';

      if (!session && !inAuthGroup && !isOnboarding && !isSignIn && !isRegister) {
        // Redirect to sign in if not authenticated
        router.replace('/signin');
      } else if (session && (isSignIn || isRegister)) {
        // Redirect to tabs if authenticated and on auth screens
        router.replace('/(tabs)');
      }
      setIsAuthChecked(true);
    };

    checkAuth();
  }, [segments, router]);

  return isAuthChecked;
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const initTheme = useThemeStore((state) => state.initTheme);
  const initLanguage = useLanguageStore((state) => state.initLanguage);
  const [appReady, setAppReady] = useState(false);
  const isAuthChecked = useProtectedRoute();
  const pathname = usePathname();
  const router = useRouter();

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async (url) => {
      if (url && (url.includes('auth/callback') || url.includes('#access_token'))) {
        try {
          const parsedUrl = new URL(url);
          
          // Supabase OAuth uses hash fragments (#) not query params (?)
          const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
          const accessToken = hashParams.get('access_token') || parsedUrl.searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || parsedUrl.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('OAuth callback error:', error);
              router.replace('/signin');
            } else {
              // Success - redirect to tabs
              router.replace('/(tabs)');
            }
          } else {
            // Check if session was set automatically
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              router.replace('/(tabs)');
            } else {
              console.error('No tokens found in callback URL');
              router.replace('/signin');
            }
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          // Try to get session anyway
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            router.replace('/(tabs)');
          } else {
            router.replace('/signin');
          }
        }
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleOAuthCallback(url);
      }
    });

    // Handle URL changes (OAuth redirect)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('URL event:', url);
      handleOAuthCallback(url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([
        initiate(),
        initTheme(),
        initLanguage(),
      ]);
      setAppReady(true);
    };
    
    initializeApp();
  }, [initiate, initTheme, initLanguage]);

  useEffect(() => {
    if (isReady && appReady && isAuthChecked) {
      SplashScreen.hideAsync();
    }
  }, [isReady, appReady, isAuthChecked]);

  if (!isReady || !appReady || !isAuthChecked) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="taqib-ad-details" />
          <Stack.Screen name="taqib-details" />
          <Stack.Screen name="tanazul-details" />
          <Stack.Screen name="chat" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
