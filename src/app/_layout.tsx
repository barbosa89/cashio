import "@/lib/backup/backup-scheduler";
import "react-native-gesture-handler";

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
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import {
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    Alert,
    LogBox,
    Platform,
    Pressable,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppIcon } from "@/components/app-icon";
import { CashioLogo } from "@/components/cashio-logo";
import { CalendarNotificationController } from "@/components/calendar-notification-controller";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { LocalizationProvider, useLocalization } from "@/i18n/localization-provider";
import { LocalizationPreferenceGate } from "@/i18n/localization-preference-gate";
import { syncBackupTaskRegistration } from "@/lib/backup/backup-scheduler";
import {
    restoreLatestBackup,
    runOpportunisticBackup,
} from "@/lib/backup/backup-service";
import {
    hasSeenRestorePrompt,
    markRestorePromptSeen,
} from "@/lib/backup/storage";
import { migrateDatabase } from "@/lib/database";

LogBox.ignoreLogs([
  "[react-native-skia] SkPath.",
  "SafeAreaView has been deprecated and will be removed in a future release.",
]);

export default function RootLayout() {
  return (
    <LocalizationProvider>
      <CashioLayout />
    </LocalizationProvider>
  );
}

function CashioLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Feather: require("react-native-vector-icons/Fonts/Feather.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DatabaseProvider />
    </ThemeProvider>
  );
}

function CashioNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <AnimatedSplashOverlay />
      <Drawer
        drawerContent={(props) => <CashioDrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: theme.surface,
            width: 300,
          },
          drawerType: "front",
          headerShown: false,
          overlayColor: "rgba(0, 0, 0, 0.32)",
        }}
      >
        <Drawer.Screen name="index" options={{ title: t("navigation.home") }} />
        <Drawer.Screen
          name="accounts"
          options={{ title: t("navigation.accounts") }}
        />
        <Drawer.Screen
          name="categories"
          options={{ title: t("navigation.categories") }}
        />
        <Drawer.Screen name="tags" options={{ title: t("navigation.tags") }} />
        <Drawer.Screen
          name="calendar"
          options={{ title: t("navigation.calendar") }}
        />
        <Drawer.Screen
          name="backup"
          options={{ title: t("navigation.backup") }}
        />
        <Drawer.Screen
          name="settings"
          options={{ title: t("navigation.settings") }}
        />
        <Drawer.Screen
          name="explore"
          options={{
            drawerItemStyle: { display: "none" },
            title: t("navigation.manage"),
          }}
        />
        <Drawer.Screen
          name="new-transaction"
          options={{
            drawerItemStyle: { display: "none" },
            title: t("navigation.newTransaction"),
          }}
        />
        <Drawer.Screen
          name="transactions/[id]/edit"
          options={{
            drawerItemStyle: { display: "none" },
            title: t("transaction.editRecord"),
          }}
        />
      </Drawer>
    </>
  );
}

function CashioDrawerContent(
  props: Readonly<DrawerContentComponentProps>,
) {
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  function navigateTo(
    path: "/" | "/calendar" | "/accounts" | "/categories" | "/tags" | "/backup" | "/settings",
  ) {
    props.navigation.closeDrawer();
    router.push(path as never);
  }

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContent,
        {
          backgroundColor: theme.surface,
          paddingBottom: Math.max(insets.bottom, Spacing.three),
          paddingTop: Math.max(insets.top + Spacing.two, Spacing.four),
        },
      ]}
    >
      <ThemedView type="surface" style={styles.drawerHeader}>
        <CashioLogo />
      </ThemedView>

      <DrawerMenuItem
        active={pathname === "/"}
        icon="home"
        label={t("navigation.home")}
        onPress={() => navigateTo("/")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/accounts")}
        icon="bank"
        label={t("navigation.accounts")}
        onPress={() => navigateTo("/accounts")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/categories")}
        icon="folder"
        label={t("navigation.categories")}
        onPress={() => navigateTo("/categories")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/tags")}
        icon="tag"
        label={t("navigation.tags")}
        onPress={() => navigateTo("/tags")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/calendar")}
        icon="calendar"
        label={t("navigation.calendar")}
        onPress={() => navigateTo("/calendar")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/backup")}
        icon="cloud"
        label={t("navigation.backup")}
        onPress={() => navigateTo("/backup")}
      />
      <DrawerMenuItem
        active={pathname.startsWith("/settings")}
        icon="settings"
        label={t("navigation.settings")}
        onPress={() => navigateTo("/settings")}
      />
    </DrawerContentScrollView>
  );
}

function DrawerMenuItem({
  active,
  icon,
  label,
  onPress,
}: Readonly<{
  active: boolean;
  icon: "bank" | "calendar" | "cash" | "cloud" | "folder" | "home" | "settings" | "tag";
  label: string;
  onPress: () => void;
}>) {
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
        type={active ? "primaryContainer" : "surface"}
        style={styles.drawerItem}
      >
        <AppIcon
          color={active ? theme.primary : theme.textSecondary}
          name={icon}
          size={22}
        />
        <ThemedText
          type="smallBold"
          themeColor={active ? "primary" : "textSecondary"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function DatabaseProvider() {
  const { language } = useLocalization();
  const { t } = useTranslation();
  const seedLanguage = useRef(language).current;
  const initializeDatabase = useCallback(
    (db: SQLiteDatabase) => migrateDatabase(db, { seedLanguage }),
    [seedLanguage],
  );
  const [canUseDatabase, setCanUseDatabase] = useState(Platform.OS !== "web");
  const [isRestoreGateReady, setIsRestoreGateReady] = useState(
    Platform.OS === "web",
  );

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
        Alert.alert(t("restoreGate.failedTitle"), translateError(error, t));
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
        t("restoreGate.title"),
        t("restoreGate.prompt"),
        [
          {
            onPress: () => void continueWithoutRestore(),
            style: "cancel",
            text: t("restoreGate.skip"),
          },
          {
            onPress: () => void restoreBackup(),
            text: t("restoreGate.restore"),
          },
        ],
        { cancelable: false },
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
        onInit={initializeDatabase}
        useSuspense
      >
        <LocalizationPreferenceGate>
          <CalendarNotificationController />
          <CashioNavigator />
        </LocalizationPreferenceGate>
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
    borderRadius: Radius.control,
    marginBottom: Spacing.two,
  },
  drawerItem: {
    alignItems: "center",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
