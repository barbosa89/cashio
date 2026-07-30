import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, type ReactNode } from "react";

import { useLocalization } from "@/i18n/localization-provider";
import type { LanguagePreference } from "@/i18n/types";
import { getLanguagePreference } from "@/lib/settings-repository";

type BootstrapState =
  | { status: "loading" }
  | { preference: LanguagePreference; status: "applying" }
  | { status: "ready" };

export function LocalizationPreferenceGate({
  children,
}: Readonly<{ children: ReactNode }>) {
  const db = useSQLiteContext();
  const {
    applyLanguagePreference,
    languagePreference,
  } = useLocalization();
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    status: "loading",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      let preference: LanguagePreference = null;

      try {
        preference = await getLanguagePreference(db);
      } catch {
        preference = null;
      }

      if (!isMounted) {
        return;
      }

      setBootstrap({ preference, status: "applying" });
      applyLanguagePreference(preference);
    }

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, [applyLanguagePreference, db]);

  useEffect(() => {
    if (
      bootstrap.status === "applying" &&
      bootstrap.preference === languagePreference
    ) {
      setBootstrap({ status: "ready" });
    }
  }, [bootstrap, languagePreference]);

  return bootstrap.status === "ready" ? children : null;
}
