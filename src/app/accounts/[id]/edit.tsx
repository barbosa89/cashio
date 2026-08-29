import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n/localization-provider';

import { AccountEditor } from '@/components/account-editor';
import { ScreenStatus } from '@/components/screen-status';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditAccountScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const { accounts, isLoading } = useCashioData();
  const account = accounts.find((item) => item.id === accountId);

  if (isLoading) {
    return <ScreenStatus message={t('common.loading')} />;
  }

  if (!account && !isLoading) {
    return (
      <ScreenStatus
        actionLabel={t('accessibility.backToAccounts')}
        message={t('admin.accountNotFound')}
        onAction={() => router.replace('/accounts')}
      />
    );
  }

  return <AccountEditor account={account} />;
}
