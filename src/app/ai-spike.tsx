import { AISpikeScreen } from "@/components/ai/ai-spike-screen";
import { ScreenStatus } from "@/components/screen-status";
import { useTranslation } from "@/i18n/localization-provider";

export default function AISpikeRoute() {
  const { t } = useTranslation();

  if (!__DEV__ && process.env.EXPO_PUBLIC_ENABLE_AI_SPIKE !== "true") {
    return <ScreenStatus message={t("aiSpike.developmentOnly")} />;
  }

  return <AISpikeScreen />;
}
