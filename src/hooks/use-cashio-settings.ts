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

  const setAccumulatePreviousBalances = useCallback(
    async (value: boolean) => {
      const previousSettings = settings;
      setSettings((currentSettings) => ({
        ...currentSettings,
        accumulatePreviousBalances: value,
      }));
      setErrorMessage('');

      try {
        await updateSetting(db, 'accumulatePreviousBalances', value);
      } catch {
        setSettings(previousSettings);
        setErrorMessage('No se pudo guardar la configuración.');
      }
    },
    [db, settings]
  );

  return {
    errorMessage,
    isLoading,
    refresh,
    settings,
    setAccumulatePreviousBalances,
  };
}
