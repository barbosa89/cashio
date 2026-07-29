import { useLocales } from "expo-localization";
import {
  useCallback,
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";

import {
  i18n,
  initialLocalization,
  resolveLocalization,
} from "@/i18n";
import type {
  AppTranslator,
  LanguagePreference,
  ResolvedLocalization,
  SupportedLanguage,
} from "@/i18n/types";

type LocalizationContextValue = ResolvedLocalization & {
  applyLanguagePreference: (preference: LanguagePreference) => void;
  deviceLanguage: SupportedLanguage;
  languagePreference: LanguagePreference;
  t: AppTranslator;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);
const initialContextValue: LocalizationContextValue = {
  ...initialLocalization,
  applyLanguagePreference: () => undefined,
  deviceLanguage: initialLocalization.language,
  languagePreference: null,
  t: i18n.getFixedT(initialLocalization.language),
};

export function LocalizationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locales = useLocales();
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>(null);
  const deviceLocalization = resolveLocalization(locales);
  const localization = resolveLocalization(locales, languagePreference);
  const { language, languageTag, textDirection } = localization;
  const applyLanguagePreference = useCallback(
    (preference: LanguagePreference) => {
      setLanguagePreference(preference);
    },
    [],
  );

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
      applyLanguagePreference,
      deviceLanguage: deviceLocalization.language,
      language,
      languageTag,
      languagePreference,
      t: i18n.getFixedT(language),
      textDirection,
    }),
    [
      applyLanguagePreference,
      deviceLocalization.language,
      language,
      languagePreference,
      languageTag,
      textDirection,
    ],
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
