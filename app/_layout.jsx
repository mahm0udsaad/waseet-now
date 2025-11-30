import { useAuth } from '@/utils/auth/useAuth';
import { useThemeStore } from '@/utils/theme/store';
import { useLanguageStore } from '@/utils/i18n/store';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const initTheme = useThemeStore((state) => state.initTheme);
  const initLanguage = useLanguageStore((state) => state.initLanguage);
  const [appReady, setAppReady] = useState(false);

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
    if (isReady && appReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady, appReady]);

  if (!isReady || !appReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="onboarding">
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="index" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="create-dhamen" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
