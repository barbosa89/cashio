import type { SQLiteDatabase } from 'expo-sqlite';

import { createLocalBackup, restoreLocalBackup } from '@/lib/backup/local-backup';
import { getBackupProvider, getDefaultBackupProviderId } from '@/lib/backup/providers';
import {
  getBackupMetadata,
  updateBackupMetadata,
} from '@/lib/backup/storage';
import type { BackupMetadata, BackupProviderId } from '@/lib/backup/types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function hasDailyBackupExpired(metadata: BackupMetadata) {
  if (!metadata.lastBackupAt) {
    return true;
  }

  return Date.now() - new Date(metadata.lastBackupAt).getTime() >= ONE_DAY_MS;
}

export async function getBackupState() {
  return getBackupMetadata();
}

export async function connectBackup(providerId: BackupProviderId | null = getDefaultBackupProviderId()) {
  const provider = await getBackupProvider(providerId);

  if (!provider) {
    throw new Error('No hay proveedor de copia de seguridad para esta plataforma.');
  }

  await provider.connect();

  return updateBackupMetadata((metadata) => ({
    ...metadata,
    lastError: null,
    provider: provider.id,
  }));
}

export async function disconnectBackup() {
  const metadata = await getBackupMetadata();
  const provider = await getBackupProvider(metadata.provider);
  await provider?.disconnect();

  return updateBackupMetadata((currentMetadata) => ({
    ...currentMetadata,
    enabled: false,
    lastError: null,
    provider: null,
  }));
}

export async function setDailyBackupEnabled(enabled: boolean) {
  const metadata = await getBackupMetadata();
  const providerId = metadata.provider ?? getDefaultBackupProviderId();

  if (enabled && !providerId) {
    throw new Error('No hay proveedor de copia de seguridad para esta plataforma.');
  }

  return updateBackupMetadata((currentMetadata) => ({
    ...currentMetadata,
    enabled,
    provider: providerId,
  }));
}

export async function runBackupNow(db?: SQLiteDatabase) {
  const metadata = await getBackupMetadata();
  const providerId = metadata.provider ?? getDefaultBackupProviderId();
  const provider = await getBackupProvider(providerId);

  if (!provider) {
    throw new Error('No hay proveedor de copia de seguridad para esta plataforma.');
  }

  try {
    await provider.connect();
    const backup = await createLocalBackup(db);
    await provider.upload(backup);

    return updateBackupMetadata((currentMetadata) => ({
      ...currentMetadata,
      lastBackupAt: backup.metadata.createdAt,
      lastError: null,
      provider: provider.id,
    }));
  } catch (error) {
    await updateBackupMetadata((currentMetadata) => ({
      ...currentMetadata,
      lastError: messageFromError(error),
      provider: providerId,
    }));
    throw error;
  }
}

export async function restoreLatestBackup() {
  const metadata = await getBackupMetadata();
  const providerId = metadata.provider ?? getDefaultBackupProviderId();
  const provider = await getBackupProvider(providerId);

  if (!provider) {
    throw new Error('No hay proveedor de copia de seguridad para esta plataforma.');
  }

  try {
    await provider.connect();
    const backup = await provider.downloadLatest();

    if (!backup) {
      throw new Error('No se encontró una copia de seguridad.');
    }

    await restoreLocalBackup(backup);

    return updateBackupMetadata((currentMetadata) => ({
      ...currentMetadata,
      lastError: null,
      lastRestoreAt: new Date().toISOString(),
      provider: provider.id,
    }));
  } catch (error) {
    await updateBackupMetadata((currentMetadata) => ({
      ...currentMetadata,
      lastError: messageFromError(error),
      provider: providerId,
    }));
    throw error;
  }
}

export async function runOpportunisticBackup() {
  const metadata = await getBackupMetadata();

  if (!metadata.enabled || !metadata.provider || !hasDailyBackupExpired(metadata)) {
    return metadata;
  }

  return runBackupNow();
}
