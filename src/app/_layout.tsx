import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import Auth from '@/components/auth';
import { SessionProvider, useSession } from '@/components/session-provider';
import { ThemedView } from '@/components/themed-view';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// shows the login screen when signed out, and the main tabs when signed in
function Gate() {
  const { userId, loading } = useSession();

  // keep the splash screen up until we know who (if anyone) is signed in
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  if (!userId) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Auth />
      </ThemedView>
    );
  }

  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
