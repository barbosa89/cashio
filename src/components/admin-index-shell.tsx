import { router, useNavigation, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AdminIndexShell({
  children,
  ctaHref,
  ctaLabel,
  emptyText,
  hasRows,
  search,
  setSearch,
  title,
}: {
  children: ReactNode;
  ctaHref: Href;
  ctaLabel: string;
  emptyText: string;
  hasRows: boolean;
  search: string;
  setSearch: (value: string) => void;
  title: string;
}) {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.phoneSurface, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.header}>
            <Pressable
              accessibilityLabel="Abrir menú"
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView style={styles.iconButton}>
                <AppIcon color={theme.text} name="menu" size={30} />
              </ThemedView>
            </Pressable>

            <View style={styles.headerActions}>
              <ThemedView style={styles.searchWrap}>
                <AppIcon color={theme.text} name="search" size={28} />
                <TextInput
                  accessibilityLabel={`Buscar ${title.toLocaleLowerCase()}`}
                  onChangeText={setSearch}
                  placeholder="Buscar"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={search}
                />
              </ThemedView>
              <ThemedView style={styles.avatar}>
                <ThemedText type="smallBold" style={styles.avatarText}>
                  OB
                </ThemedText>
              </ThemedView>
            </View>
          </ThemedView>

          <ThemedView style={[styles.titleRow, { borderBottomColor: theme.backgroundSelected }]}>
            <Pressable
              accessibilityLabel="Volver al índice de transacciones"
              onPress={() => router.replace('/')}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.listContent} style={styles.list}>
            {hasRows ? (
              children
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {emptyText}
                </ThemedText>
              </ThemedView>
            )}
          </ScrollView>

          <Pressable
            accessibilityLabel={ctaLabel}
            onPress={() => router.push(ctaHref)}
            style={({ pressed }) => [
              styles.fab,
              { borderColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <AppIcon color="#FFFFFF" name="plus" size={36} />
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
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.three : 0,
  },
  phoneSurface: {
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    position: 'relative',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  searchWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    maxWidth: 150,
  },
  searchInput: {
    fontSize: 14,
    minWidth: 0,
    paddingVertical: Spacing.one,
    width: 88,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#126B8D',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  titleRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + 96,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    minHeight: 240,
    justifyContent: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: Spacing.two,
    borderWidth: 2,
    bottom: BottomTabInset + Spacing.three,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.three,
    width: 64,
    zIndex: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
