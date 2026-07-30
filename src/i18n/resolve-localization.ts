import {
  SUPPORTED_LANGUAGES,
  type DeviceLocale,
  type LanguagePreference,
  type ResolvedLocalization,
  type SupportedLanguage,
} from "./types";

const DEFAULT_LANGUAGE_TAGS = {
  en: "en-US",
  es: "es-CO",
  pt: "pt-BR",
} as const satisfies Record<SupportedLanguage, string>;

const FALLBACK_LOCALIZATION: ResolvedLocalization = {
  language: "en",
  languageTag: DEFAULT_LANGUAGE_TAGS.en,
  textDirection: "ltr",
};

const supportedLanguageSet = new Set<string>(SUPPORTED_LANGUAGES);

export function resolveLocalization(
  locales: readonly DeviceLocale[],
  preference: LanguagePreference = null,
): ResolvedLocalization {
  if (preference) {
    const matchingLocale = locales.find(
      (locale) => getLocaleLanguage(locale) === preference,
    );

    return {
      language: preference,
      languageTag:
        matchingLocale?.languageTag ?? DEFAULT_LANGUAGE_TAGS[preference],
      textDirection: "ltr",
    };
  }

  for (const locale of locales) {
    const language = getLocaleLanguage(locale);

    if (language && supportedLanguageSet.has(language)) {
      return {
        language: language as SupportedLanguage,
        languageTag: locale.languageTag,
        textDirection: "ltr",
      };
    }
  }

  return FALLBACK_LOCALIZATION;
}

function getLocaleLanguage(locale: DeviceLocale) {
  return (
    locale.languageCode ?? locale.languageTag.split("-")[0]
  ).toLowerCase();
}
