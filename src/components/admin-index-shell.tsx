import { router, useNavigation, type Href } from "expo-router";
import { type ReactNode } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, BottomTabInset, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function AdminIndexShell({
  children,
  ctaHref,
  ctaLabel,
  emptyText,
  hasRows,
  isLoading,
  search,
  setSearch,
  title,
}: {
  children: ReactNode;
  ctaHref: Href;
  ctaLabel: string;
  emptyText: string;
  hasRows: boolean;
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  title: string;
}) {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <ThemedView type="canvas" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          type="surface"
          style={[
            styles.phoneSurface,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ThemedView type="surface" style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.openMenu")}
              accessibilityRole="button"
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="surfaceMuted" style={styles.iconButton}>
                <AppIcon color={theme.text} name="menu" size={26} />
              </ThemedView>
            </Pressable>

            <View style={styles.headerActions}>
              <ThemedView type="surfaceMuted" style={styles.searchWrap}>
                <TextInput
                  accessibilityLabel={`${t("common.search")} ${title}`}
                  onChangeText={setSearch}
                  placeholder={t("common.search")}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={search}
                />
              </ThemedView>
            </View>
          </ThemedView>

          <ThemedView
            type="surface"
            style={[
              styles.titleRow,
              { borderBottomColor: theme.border },
            ]}
          >
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          </ThemedView>

          <ScrollView
            contentContainerStyle={styles.listContent}
            style={styles.list}
          >
            {isLoading ? (
              <View style={styles.emptyState}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t("common.loading")}
                </ThemedText>
              </View>
            ) : hasRows ? (
              children
            ) : (
              <View style={styles.emptyState}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {emptyText}
                </ThemedText>
              </View>
            )}
          </ScrollView>

          <Pressable
            accessibilityLabel={ctaLabel}
            onPress={() => router.push(ctaHref)}
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
          >
            <AppIcon color={AppPalette.foregroundOnBrand} name="plus" size={36} />
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    alignItems: "center",
    flex: 1,
    minHeight: 0,
    paddingTop: Platform.OS === "web" ? Spacing.three : 0,
  },
  phoneSurface: {
    borderWidth: Platform.OS === "web" ? 1 : 0,
    flex: 1,
    maxWidth: MaxContentWidth,
    minHeight: 0,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "space-between",
    minWidth: 0,
  },
  searchWrap: {
    alignItems: "center",
    borderRadius: Radius.control,
    flex: 1,
    justifyContent: "center",
    height: 48,
    minWidth: 0,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 0,
    paddingVertical: 0,
    textAlign: "center",
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  titleRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + 96,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  emptyState: {
    alignItems: "center",
    minHeight: 240,
    justifyContent: "center",
  },
  fab: {
    alignItems: "center",
    backgroundColor: AppPalette.brandOrange,
    borderColor: "transparent",
    borderRadius: Radius.card,
    borderWidth: 2,
    bottom: BottomTabInset + Spacing.three,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.three,
    width: 64,
    zIndex: 2,
  },
  fabPressed: {
    backgroundColor: AppPalette.brandOrangeActive,
  },
  pressed: {
    opacity: 0.7,
  },
});
