import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { migrateDatabase } from '@/lib/database';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Feather: require('react-native-vector-icons/Fonts/Feather.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </DatabaseProvider>
    </ThemeProvider>
  );
}

function DatabaseProvider({ children }: { children: ReactNode }) {
  const [canUseDatabase, setCanUseDatabase] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setCanUseDatabase(true);
  }, []);

  if (!canUseDatabase) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SQLiteProvider databaseName="cashio.db" onInit={migrateDatabase} useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}
