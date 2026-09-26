import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { ScreenStatus } from "@/components/screen-status";
import { TransactionEditorScreen } from "@/components/transaction-editor-screen";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTranslation } from "@/i18n/localization-provider";
import type {
  CreateTransactionInput,
  EditableTransaction,
} from "@/lib/cashio-repository";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const hasValidId = Number.isInteger(transactionId) && transactionId > 0;
  const { t } = useTranslation();
  const { editTransaction, getTransactionForEditing } = useCashioData();
  const [transaction, setTransaction] = useState<
    EditableTransaction | null | undefined
  >(hasValidId ? undefined : null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!hasValidId) {
      return;
    }
    let isCurrent = true;
    setHasError(false);
    setTransaction(undefined);
    void getTransactionForEditing(transactionId)
      .then((nextTransaction) => {
        if (isCurrent) {
          setTransaction(nextTransaction);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setHasError(true);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [getTransactionForEditing, hasValidId, transactionId]);

  if (hasError || transaction === null) {
    return (
      <ScreenStatus
        actionLabel={t("accessibility.backToTransactions")}
        message={hasError ? t("errors.generic") : t("transaction.notFound")}
        onAction={() => router.replace("/")}
      />
    );
  }
  if (transaction === undefined) {
    return <ScreenStatus message={t("common.loading")} />;
  }
  const editableTransaction = transaction;

  async function handleSubmit(values: CreateTransactionInput) {
    await editTransaction(editableTransaction.id, values);
  }

  return (
    <TransactionEditorScreen
      accountOptions={editableTransaction.accountOptions}
      formKey={editableTransaction.id}
      initialValues={editableTransaction.values}
      mode="edit"
      onSaved={() => router.replace("/")}
      onSubmit={handleSubmit}
      title={t("transaction.editRecord")}
    />
  );
}
