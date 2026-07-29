import { Platform } from 'react-native';

import { AppError } from '@/i18n/errors';
import type { BackupProvider, BackupProviderId } from '@/lib/backup/types';

type GoogleDriveProviderModule = {
  googleDriveBackupProvider: BackupProvider;
};

type ICloudProviderModule = {
  icloudBackupProvider: BackupProvider;
};

declare const require: (moduleName: string) => unknown;

function createUnavailableProvider(providerId: BackupProviderId, label: string, reason: unknown): BackupProvider {
  const unavailableError = () =>
    new AppError(
      { code: 'nativeModuleUnavailable', values: { provider: label } },
      { cause: reason },
    );

  return {
    id: providerId,
    label,
    async connect() {
      throw unavailableError();
    },
    async disconnect() {
      return;
    },
    async isAvailable() {
      return false;
    },
    async upload() {
      throw unavailableError();
    },
    async downloadLatest() {
      throw unavailableError();
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
