import { Platform } from 'react-native';

import type { BackupProvider, BackupProviderId } from '@/lib/backup/types';

type GoogleDriveProviderModule = {
  googleDriveBackupProvider: BackupProvider;
};

type ICloudProviderModule = {
  icloudBackupProvider: BackupProvider;
};

declare const require: (moduleName: string) => unknown;

function createUnavailableProvider(providerId: BackupProviderId, label: string, reason: unknown): BackupProvider {
  const detail = reason instanceof Error ? reason.message : 'El módulo nativo no está disponible.';
  const message =
    `${label} no está disponible en esta build. ` +
    'Reconstruye la app después de instalar los paquetes nativos. ' +
    detail;

  return {
    id: providerId,
    label,
    async connect() {
      throw new Error(message);
    },
    async disconnect() {
      return;
    },
    async isAvailable() {
      return false;
    },
    async upload() {
      throw new Error(message);
    },
    async downloadLatest() {
      throw new Error(message);
    },
  };
}

export function getDefaultBackupProviderId(): BackupProviderId | null {
  if (Platform.OS === 'android') {
    return 'google-drive';
  }

  if (Platform.OS === 'ios') {
    return 'icloud';
  }

  return null;
}

export async function getBackupProvider(providerId: BackupProviderId | null): Promise<BackupProvider | null> {
  if (providerId === 'google-drive') {
    try {
      const { googleDriveBackupProvider } = require('./google-drive-provider') as GoogleDriveProviderModule;
      return googleDriveBackupProvider;
    } catch (error) {
      return createUnavailableProvider('google-drive', 'Google Drive', error);
    }
  }

  if (providerId === 'icloud') {
    try {
      const { icloudBackupProvider } = require('./icloud-provider') as ICloudProviderModule;
      return icloudBackupProvider;
    } catch (error) {
      return createUnavailableProvider('icloud', 'iCloud', error);
    }
  }

  return null;
}
