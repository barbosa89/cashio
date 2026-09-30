import { router } from "expo-router";

import { ScreenStatus } from "@/components/screen-status";
import { useTranslation } from "@/i18n/localization-provider";

export function VoiceTransactionScreen() {
  const { t } = useTranslation();

  return (
    <ScreenStatus
      actionLabel={t("voiceTransaction.manualEntry")}
      message={t("voiceTransaction.nativeOnly")}
      onAction={() => router.replace("/new-transaction")}
    />
  );
}
