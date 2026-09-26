import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/localization-provider';

import { ScreenStatus } from '@/components/screen-status';
import { TransactionEditorScreen } from '@/components/transaction-editor-screen';
import { useCashioData } from '@/hooks/use-cashio-data';
import type { EditableTransaction } from '@/lib/cashio-repository';

function todayDateValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function NewTransactionScreen() {
  const { t } = useTranslation();
  const { getTransactionForEditing } = useCashioData();
  const params = useLocalSearchParams<{ accountId?: string; duplicateOf?: string }>();
  const parsedAccountId = Number(params.accountId);
  const initialAccountId =
    Number.isInteger(parsedAccountId) && parsedAccountId > 0
      ? parsedAccountId
      : null;
  const duplicateId = Number(params.duplicateOf);
  const hasDuplicateRequest = params.duplicateOf !== undefined;
  const hasValidDuplicateId = Number.isInteger(duplicateId) && duplicateId > 0;
  const [duplicateTransaction, setDuplicateTransaction] = useState<
    EditableTransaction | null | undefined
  >(hasDuplicateRequest ? undefined : null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (!hasDuplicateRequest) {
      return;
    }
    if (!hasValidDuplicateId) {
      return;
    }

    let isCurrent = true;
    setHasLoadError(false);
    setDuplicateTransaction(undefined);
    void getTransactionForEditing(duplicateId)
      .then((transaction) => {
        if (!isCurrent) {
          return;
        }
        setDuplicateTransaction(
          transaction
            ? {
                ...transaction,
                values: {
                  ...transaction.values,
                  transactionDate: todayDateValue(),
                },
              }
            : null,
        );
      })
      .catch(() => {
        if (isCurrent) {
          setHasLoadError(true);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [duplicateId, getTransactionForEditing, hasDuplicateRequest, hasValidDuplicateId]);

  if (hasDuplicateRequest && !hasValidDuplicateId) {
    return (
      <ScreenStatus
        actionLabel={t('accessibility.backToTransactions')}
        message={t('transaction.notFound')}
        onAction={() => router.replace('/')}
      />
    );
  }
  if (hasLoadError || (hasDuplicateRequest && duplicateTransaction === null)) {
    return (
      <ScreenStatus
        actionLabel={t('accessibility.backToTransactions')}
        message={hasLoadError ? t('errors.generic') : t('transaction.notFound')}
        onAction={() => router.replace('/')}
      />
    );
  }
  if (duplicateTransaction === undefined) {
    return <ScreenStatus message={t('common.loading')} />;
  }

  return (
    <TransactionEditorScreen
      accountOptions={[]}
      formKey={hasDuplicateRequest ? duplicateId : "new"}
      initialAccountId={initialAccountId}
      initialValues={duplicateTransaction?.values ?? null}
      onSaved={() => router.replace('/')}
      title={
        hasDuplicateRequest
          ? t('transaction.duplicateRecord')
          : t('transaction.newRecord')
      }
    />
  );
}
