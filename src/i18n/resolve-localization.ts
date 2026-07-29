import {
  SUPPORTED_LANGUAGES,
  type DeviceLocale,
  type ResolvedLocalization,
  type SupportedLanguage,
} from "./types";

const FALLBACK_LOCALIZATION: ResolvedLocalization = {
  language: "en",
  languageTag: "en-US",
  textDirection: "ltr",
};

const supportedLanguageSet = new Set<string>(SUPPORTED_LANGUAGES);

export function resolveLocalization(
  locales: readonly DeviceLocale[],
): ResolvedLocalization {
  for (const locale of locales) {
    const language = (
      locale.languageCode ?? locale.languageTag.split("-")[0]
    ).toLowerCase();

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
