import { useLocales } from "expo-localization";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";

import {
  i18n,
  initialLocalization,
  resolveLocalization,
} from "@/i18n";
import type { AppTranslator, ResolvedLocalization } from "@/i18n/types";

type LocalizationContextValue = ResolvedLocalization & {
  t: AppTranslator;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);
const initialContextValue: LocalizationContextValue = {
  ...initialLocalization,
  t: i18n.getFixedT(initialLocalization.language),
};

export function LocalizationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locales = useLocales();
  const localization = resolveLocalization(locales);
  const { language, languageTag, textDirection } = localization;

  useEffect(() => {
    if (i18n.resolvedLanguage !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = languageTag;
    document.documentElement.dir = textDirection;
  }, [languageTag, textDirection]);

  const value = useMemo(
    () => ({
      language,
      languageTag,
      t: i18n.getFixedT(language),
      textDirection,
    }),
    [language, languageTag, textDirection],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocalizationContext value={value}>{children}</LocalizationContext>
    </I18nextProvider>
  );
}

export function useLocalization() {
  const localization = use(LocalizationContext);

  if (!localization) {
    return initialContextValue;
  }

  return localization;
}

export function useTranslation() {
  const { t } = useLocalization();
  return { t };
}
