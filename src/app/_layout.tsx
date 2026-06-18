import "react-native-gesture-handler";
import "@/lib/backup/backup-scheduler";

import { useFonts } from "expo-font";
import {
    DarkTheme,
    DefaultTheme,
    router,
    ThemeProvider,
    usePathname,
} from "expo-router";
import {
    Drawer,
    DrawerContentScrollView,
    type DrawerContentComponentProps,
} from "expo-router/drawer";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Alert, LogBox, Platform, Pressable, StyleSheet, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppIcon } from "@/components/app-icon";
import { CashioLogo } from "@/components/cashio-logo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { restoreLatestBackup, runOpportunisticBackup } from "@/lib/backup/backup-service";
import { syncBackupTaskRegistration } from "@/lib/backup/backup-scheduler";
import { hasSeenRestorePrompt, markRestorePromptSeen } from "@/lib/backup/storage";
import { migrateDatabase } from "@/lib/database";

LogBox.ignoreLogs([
  "[react-native-skia] SkPath.",
  "SafeAreaView has been deprecated and will be removed in a future release.",
]);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [fontsLoaded] = useFonts({
    Feather: require("react-native-vector-icons/Fonts/Feather.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <AnimatedSplashOverlay />
        <Drawer
          drawerContent={(props) => <CashioDrawerContent {...props} />}
          screenOptions={{
            drawerStyle: {
              backgroundColor: theme.background,
              width: 300,
            },
            drawerType: "front",
            headerShown: false,
            overlayColor: "rgba(0, 0, 0, 0.45)",
          }}
        >
          <Drawer.Screen name="index" options={{ title: "Inicio" }} />
          <Drawer.Screen name="categories" options={{ title: "Categorías" }} />
          <Drawer.Screen name="tags" options={{ title: "Tags" }} />
          <Drawer.Screen name="backup" options={{ title: "Copia de seguridad" }} />
          <Drawer.Screen
            name="explore"
            options={{
              drawerItemStyle: { display: "none" },
              title: "Administrar",
            }}
          />
          <Drawer.Screen
            name="new-transaction"
            options={{
              drawerItemStyle: { display: "none" },
              title: "Nueva transacción",
            }}
          />
        </Drawer>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

function CashioDrawerContent(props: DrawerContentComponentProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  function navigateTo(path: "/" | "/categories" | "/tags" | "/backup") {
    props.navigation.closeDrawer();
    router.push(path);
  }

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContent,
        {
          backgroundColor: theme.background,
          paddingBottom: Math.max(insets.bottom, Spacing.three),
          paddingTop: Math.max(insets.top + Spacing.two, Spacing.four),
        },
      ]}
    >
      <ThemedView style={styles.drawerHeader}>
        <CashioLogo />
      </ThemedView>

      <DrawerMenuItem
        active={pathname === "/"}
        icon="home"
        label="Inicio"
        onPress={() => navigateTo("/")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/categories")}
        icon="folder"
        label="Categorías"
        onPress={() => navigateTo("/categories")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/tags")}
        icon="tag"
        label="Tags"
        onPress={() => navigateTo("/tags")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/backup")}
        icon="cloud"
        label="Copia de seguridad"
        onPress={() => navigateTo("/backup")}
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
  icon: "cloud" | "folder" | "home" | "tag";
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItemPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type={active ? "backgroundSelected" : "background"}
        style={styles.drawerItem}
      >
        <AppIcon
          color={active ? theme.text : theme.textSecondary}
          name={icon}
          size={22}
        />
        <ThemedText
          type="smallBold"
          themeColor={active ? "text" : "textSecondary"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function DatabaseProvider({ children }: { children: ReactNode }) {
  const [canUseDatabase, setCanUseDatabase] = useState(Platform.OS !== "web");
  const [isRestoreGateReady, setIsRestoreGateReady] = useState(Platform.OS === "web");

  useEffect(() => {
    setCanUseDatabase(true);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;

    async function continueWithoutRestore() {
      await markRestorePromptSeen();
      if (isMounted) {
        setIsRestoreGateReady(true);
      }
    }

    async function restoreBackup() {
      try {
        await restoreLatestBackup();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo restaurar la copia de seguridad.";
        Alert.alert("No se pudo restaurar", message);
      } finally {
        await markRestorePromptSeen();
        if (isMounted) {
          setIsRestoreGateReady(true);
        }
      }
    }

    async function maybeAskForRestore() {
      if (await hasSeenRestorePrompt()) {
        setIsRestoreGateReady(true);
        return;
      }

      Alert.alert(
        "Restaurar copia de seguridad",
        "¿Deseas buscar y restaurar una copia de seguridad antes de iniciar Cash IO?",
        [
          {
            onPress: () => void continueWithoutRestore(),
            style: "cancel",
            text: "Omitir",
          },
          {
            onPress: () => void restoreBackup(),
            text: "Restaurar",
          },
        ],
        { cancelable: false }
      );
    }

    void maybeAskForRestore();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canUseDatabase || !isRestoreGateReady || Platform.OS === "web") {
      return;
    }

    void syncBackupTaskRegistration().catch(() => undefined);
    void runOpportunisticBackup().catch(() => undefined);
  }, [canUseDatabase, isRestoreGateReady]);

  if (!canUseDatabase || !isRestoreGateReady) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SQLiteProvider
        databaseName="cashio.db"
        onInit={migrateDatabase}
        useSuspense
      >
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  drawerHeader: {
    alignItems: "center",
    paddingBottom: Spacing.three,
  },
  drawerItemPressable: {
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  drawerItem: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
