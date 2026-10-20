import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '@/api/supabase';
import AppTabs from '@/components/app-tabs';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  //signs in with test account automatically
  //DELETE ONCE USER CREATION IS DONE.
  useEffect(() => {
    supabase.auth
      .signInWithPassword({ email: 'tjsheeha@uvm.edu', password: 'cwrynn' })
      .then(({ error }) => console.log(error ?? 'signed in'));
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppTabs />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
