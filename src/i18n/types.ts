import type { TFunction } from "i18next";

export const SUPPORTED_LANGUAGES = ["en", "es", "pt"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type ResolvedLocalization = {
  language: SupportedLanguage;
  languageTag: string;
  textDirection: "ltr";
};

export type AppTranslator = TFunction<"translation">;

export type TranslationSchema<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : TranslationSchema<T[Key]>;
};

export type DeviceLocale = {
  languageCode: string | null;
  languageTag: string;
};
