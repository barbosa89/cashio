import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n/localization-provider';

import { TagEditor } from '@/components/tag-editor';
import { ScreenStatus } from '@/components/screen-status';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditTagScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { isLoading, tags } = useCashioData();
  const tagId = Number(params.id);
  const tag = tags.find((item) => item.id === tagId);

  if (isLoading) {
    return <ScreenStatus message={t('common.loading')} />;
  }

  if (!tag && !isLoading) {
    return (
      <ScreenStatus
        actionLabel={t('accessibility.backToTags')}
        message={t('admin.tagNotFound')}
        onAction={() => router.replace('/tags')}
      />
    );
  }

  return <TagEditor tag={tag} />;
}
