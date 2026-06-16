import 'react-native-gesture-handler';

import { DarkTheme, DefaultTheme, router, ThemeProvider, useGlobalSearchParams, usePathname } from 'expo-router';
import { Drawer, DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { migrateDatabase } from '@/lib/database';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
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
        <Drawer
          drawerContent={(props) => <CashioDrawerContent {...props} />}
          screenOptions={{
            drawerStyle: {
              backgroundColor: theme.background,
              width: 300,
            },
            drawerType: 'front',
            headerShown: false,
            overlayColor: 'rgba(0, 0, 0, 0.45)',
          }}>
          <Drawer.Screen name="index" options={{ title: 'Inicio' }} />
          <Drawer.Screen name="explore" options={{ title: 'Administrar' }} />
          <Drawer.Screen
            name="new-transaction"
            options={{ drawerItemStyle: { display: 'none' }, title: 'Nueva transacción' }}
          />
        </Drawer>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

function CashioDrawerContent(props: DrawerContentComponentProps) {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ section?: string }>();
  const theme = useTheme();

  function navigateTo(pathname: '/', section?: never): void;
  function navigateTo(pathname: '/explore', section: 'categories' | 'tags'): void;
  function navigateTo(path: '/' | '/explore', section?: 'categories' | 'tags') {
    props.navigation.closeDrawer();
    if (path === '/explore') {
      router.push({ pathname: path, params: { section } });
      return;
    }
    router.push(path);
  }

  const activeSection = pathname === '/explore' ? params.section : null;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { backgroundColor: theme.background }]}>
      <ThemedView style={styles.drawerHeader}>
        <ThemedView style={styles.drawerAvatar}>
          <ThemedText type="smallBold" style={styles.drawerAvatarText}>
            OB
          </ThemedText>
        </ThemedView>
        <View>
          <ThemedText type="subtitle" style={styles.drawerTitle}>
            Cashio
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Menú principal
          </ThemedText>
        </View>
      </ThemedView>

      <DrawerMenuItem
        active={pathname === '/'}
        icon="home"
        label="Inicio"
        onPress={() => navigateTo('/')}
      />
      <DrawerMenuItem
        active={activeSection === 'categories'}
        icon="folder"
        label="Categorías"
        onPress={() => navigateTo('/explore', 'categories')}
      />
      <DrawerMenuItem
        active={activeSection === 'tags'}
        icon="tag"
        label="Tags"
        onPress={() => navigateTo('/explore', 'tags')}
      />
    </DrawerContentScrollView>
  );
}

function DrawerMenuItem({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: 'folder' | 'home' | 'tag';
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.drawerItemPressable, pressed && styles.pressed]}>
      <ThemedView type={active ? 'backgroundSelected' : 'background'} style={styles.drawerItem}>
        <AppIcon color={active ? theme.text : theme.textSecondary} name={icon} size={22} />
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
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

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  drawerAvatar: {
    alignItems: 'center',
    backgroundColor: '#126B8D',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  drawerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  drawerItemPressable: {
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  drawerItem: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
