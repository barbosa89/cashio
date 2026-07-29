import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "@/i18n/locales/en";
import { es } from "@/i18n/locales/es";
import { pt } from "@/i18n/locales/pt";
import { resolveLocalization } from "@/i18n/resolve-localization";
import { SUPPORTED_LANGUAGES } from "@/i18n/types";

export { resolveLocalization } from "@/i18n/resolve-localization";

export const initialLocalization = resolveLocalization(getLocales());

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: initialLocalization.language,
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
  },
  returnNull: false,
  supportedLngs: [...SUPPORTED_LANGUAGES],
});
