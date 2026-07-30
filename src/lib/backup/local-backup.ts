import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { AppError } from '@/i18n/errors';
import type { BackupFileMetadata, CloudBackup } from '@/lib/backup/types';

const DATABASE_NAME = 'cashio.db';
const BACKUP_FILE_NAME = 'cashio-backup.db';
const RESTORE_CANDIDATE_NAME = 'cashio-restore-candidate.db';

function requireNativePlatform() {
  if (Platform.OS === 'web') {
    throw new AppError({ code: 'backupWebUnavailable' });
  }
}

function ensureFileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function getCacheFileUri(fileName: string) {
  if (!FileSystem.cacheDirectory) {
    throw new AppError({ code: 'tempDirectoryUnavailable' });
  }

  return `${FileSystem.cacheDirectory}${fileName}`;
}

function getCacheDatabaseDirectory() {
  if (!FileSystem.cacheDirectory) {
    return undefined;
  }

  return FileSystem.cacheDirectory.replace(/^file:\/\//, '');
}

async function hashBase64(base64: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
}

async function withDatabase<T>(
  currentDb: SQLiteDatabase | undefined,
  task: (db: SQLiteDatabase) => Promise<T>
) {
  if (currentDb) {
    return task(currentDb);
  }

  const db = await openDatabaseAsync(DATABASE_NAME);

  try {
    return await task(db);
  } finally {
    await db.closeAsync();
  }
}

export async function createLocalBackup(currentDb?: SQLiteDatabase): Promise<CloudBackup> {
  requireNativePlatform();

  return withDatabase(currentDb, async (db) => {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

    const sourceUri = ensureFileUri(db.databasePath);
    const backupUri = getCacheFileUri(BACKUP_FILE_NAME);
    await FileSystem.copyAsync({ from: sourceUri, to: backupUri });

    const fileInfo = await FileSystem.getInfoAsync(backupUri);
    if (!fileInfo.exists) {
      throw new AppError({ code: 'backupPrepareFailed' });
    }

    const databaseBase64 = await FileSystem.readAsStringAsync(backupUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const metadata: BackupFileMetadata = {
      app: 'Cash IO',
      databaseName: DATABASE_NAME,
      createdAt: new Date().toISOString(),
      hash: await hashBase64(databaseBase64),
      size: fileInfo.size ?? 0,
    };

    return { databaseBase64, localUri: backupUri, metadata };
  });
}

export async function validateBackup(backup: CloudBackup) {
  requireNativePlatform();

  const hash = await hashBase64(backup.databaseBase64);
  if (hash !== backup.metadata.hash) {
    throw new AppError({ code: 'backupHashMismatch' });
  }

  const candidateUri = getCacheFileUri(RESTORE_CANDIDATE_NAME);
  await FileSystem.writeAsStringAsync(candidateUri, backup.databaseBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const db = await openDatabaseAsync(RESTORE_CANDIDATE_NAME, undefined, getCacheDatabaseDirectory());

  try {
    const result = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check;');
    if (result?.integrity_check !== 'ok') {
      throw new AppError({ code: 'backupIntegrityFailed' });
    }
  } finally {
    await db.closeAsync();
    await FileSystem.deleteAsync(candidateUri, { idempotent: true });
  }
}

export async function restoreLocalBackup(backup: CloudBackup) {
  requireNativePlatform();
  await validateBackup(backup);

  const targetDb = await openDatabaseAsync(DATABASE_NAME);
  const targetUri = ensureFileUri(targetDb.databasePath);
  await targetDb.closeAsync();

  const restoreUri = getCacheFileUri(RESTORE_CANDIDATE_NAME);
  await FileSystem.writeAsStringAsync(restoreUri, backup.databaseBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await FileSystem.copyAsync({ from: restoreUri, to: targetUri });
  await FileSystem.deleteAsync(restoreUri, { idempotent: true });
  await FileSystem.deleteAsync(`${targetUri}-wal`, { idempotent: true });
  await FileSystem.deleteAsync(`${targetUri}-shm`, { idempotent: true });
}
