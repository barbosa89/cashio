import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  useLocalization,
  useTranslation,
} from '@/i18n/localization-provider';
import type { LanguagePreference } from '@/i18n/types';

import {
  getAppSettings,
  setLanguagePreference as persistLanguagePreference,
  updateSetting,
  type AppSettings,
} from '@/lib/settings-repository';

const DEFAULT_SETTINGS: AppSettings = {
  accumulatePreviousBalances: false,
  autoCopyPreviousMonthBudget: false,
  languagePreference: null,
};

export function useCashioSettings() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const {
    applyLanguagePreference,
    language,
    languagePreference,
  } = useLocalization();
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    languagePreference,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      const nextSettings = await getAppSettings(db);
      setSettings(nextSettings);
      applyLanguagePreference(nextSettings.languagePreference);
      setErrorMessage('');
    } catch {
      setErrorMessage(t('errors.settingsLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [applyLanguagePreference, db, t]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const updateBooleanSetting = useCallback(
    async (
      key: 'accumulatePreviousBalances' | 'autoCopyPreviousMonthBudget',
      value: boolean,
    ) => {
      const previousSettings = settings;
      setSettings((currentSettings) => ({
        ...currentSettings,
        [key]: value,
      }));
      setErrorMessage('');

      try {
        await updateSetting(db, key, value);
      } catch {
        setSettings((currentSettings) =>
          currentSettings[key] === value
            ? {
                ...currentSettings,
                [key]: previousSettings[key],
              }
            : currentSettings
        );
        setErrorMessage(t('errors.settingsSave'));
      }
    },
    [db, settings, t]
  );

  const setAccumulatePreviousBalances = useCallback(
    async (value: boolean) => {
      await updateBooleanSetting('accumulatePreviousBalances', value);
    },
    [updateBooleanSetting]
  );

  const setAutoCopyPreviousMonthBudget = useCallback(
    async (value: boolean) => {
      await updateBooleanSetting('autoCopyPreviousMonthBudget', value);
    },
    [updateBooleanSetting]
  );

  const setLanguagePreference = useCallback(
    async (preference: LanguagePreference) => {
      const previousPreference = settings.languagePreference;

      if (
        previousPreference === preference ||
        (previousPreference === null && preference === language)
      ) {
        return;
      }

      setSettings((currentSettings) => ({
        ...currentSettings,
        languagePreference: preference,
      }));
      setIsSavingLanguage(true);
      setErrorMessage('');
      applyLanguagePreference(preference);

      try {
        await persistLanguagePreference(db, preference);
      } catch {
        setSettings((currentSettings) => ({
          ...currentSettings,
          languagePreference: previousPreference,
        }));
        applyLanguagePreference(previousPreference);
        setErrorMessage(t('errors.settingsSave'));
      } finally {
        setIsSavingLanguage(false);
      }
    },
    [
      applyLanguagePreference,
      db,
      language,
      settings,
      t,
    ],
  );

  return {
    errorMessage,
    isLoading,
    isSavingLanguage,
    refresh,
    settings,
    setAccumulatePreviousBalances,
    setAutoCopyPreviousMonthBudget,
    setLanguagePreference,
  };
}
