import { VoiceTransactionScreen } from "@/components/voice-transaction-screen";
import { ScreenStatus } from "@/components/screen-status";
import { useTranslation } from "@/i18n/localization-provider";
import { isVoiceTransactionEnabled } from "@/lib/ai/feature-flags";

export default function VoiceTransactionRoute() {
  const { t } = useTranslation();

  if (!isVoiceTransactionEnabled()) {
    return <ScreenStatus message={t("voiceTransaction.notEnabled")} />;
  }

  return <VoiceTransactionScreen />;
}
