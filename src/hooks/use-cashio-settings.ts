import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  getAppSettings,
  updateSetting,
  type AppSettings,
} from '@/lib/settings-repository';

const DEFAULT_SETTINGS: AppSettings = {
  accumulatePreviousBalances: false,
  autoCopyPreviousMonthBudget: false,
};

export function useCashioSettings() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      setSettings(await getAppSettings(db));
      setErrorMessage('');
    } catch {
      setErrorMessage('No se pudieron cargar las configuraciones.');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const updateBooleanSetting = useCallback(
    async <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
      const previousSettings = settings;
      setSettings((currentSettings) => ({
        ...currentSettings,
        [key]: value,
      }));
      setErrorMessage('');

      try {
        await updateSetting(db, key, value);
      } catch {
        setSettings(previousSettings);
        setErrorMessage('No se pudo guardar la configuración.');
      }
    },
    [db, settings]
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

  return {
    errorMessage,
    isLoading,
    refresh,
    settings,
    setAccumulatePreviousBalances,
    setAutoCopyPreviousMonthBudget,
  };
}
