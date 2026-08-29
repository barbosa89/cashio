import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n/localization-provider';

import { CategoryEditor } from '@/components/category-editor';
import { ScreenStatus } from '@/components/screen-status';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditCategoryScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { categories, isLoading } = useCashioData();
  const categoryId = Number(params.id);
  const category = categories.find((item) => item.id === categoryId);

  if (isLoading) {
    return <ScreenStatus message={t('common.loading')} />;
  }

  if (!category && !isLoading) {
    return (
      <ScreenStatus
        actionLabel={t('accessibility.backToCategories')}
        message={t('admin.categoryNotFound')}
        onAction={() => router.replace('/categories')}
      />
    );
  }

  return <CategoryEditor category={category} />;
}
