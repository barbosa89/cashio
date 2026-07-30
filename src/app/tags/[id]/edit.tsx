import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { TagEditor } from '@/components/tag-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditTagScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { isLoading, tags } = useCashioData();
  const tagId = Number(params.id);
  const tag = tags.find((item) => item.id === tagId);

  if (!tag && !isLoading) {
    return (
      <ThemedView style={styles.notFound}>
        <View style={styles.notFoundContent}>
          <ThemedText type="subtitle">{t('admin.tagNotFound')}</ThemedText>
          <Pressable onPress={() => router.replace('/tags')} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.backButton}>
              <ThemedText type="smallBold">{t('accessibility.backToTags')}</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return <TagEditor tag={tag} />;
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  notFoundContent: {
    gap: Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
