import { Platform } from 'react-native';

import type { BackupFileMetadata, BackupProvider, CloudBackup } from '@/lib/backup/types';

type CloudStoreModule = {
  createDir(path: string): Promise<void>;
  download(path: string): Promise<void>;
  exist(path: string): Promise<boolean>;
  getDefaultICloudContainerPath(): Promise<string | null>;
  isICloudAvailable(): Promise<boolean>;
  readFile(path: string): Promise<string>;
  unlink(path: string): Promise<void>;
  upload(localPath: string, iCloudPath: string): Promise<void>;
  writeFile(path: string, content: string, options?: { override?: boolean }): Promise<void>;
};

const BACKUP_DIR_NAME = 'CashIOBackups';
const BACKUP_FILE_NAME = 'cashio.db';
const BACKUP_BASE64_FILE_NAME = 'cashio.db.base64';
const METADATA_FILE_NAME = 'cashio-backup.json';

declare const require: (moduleName: string) => CloudStoreModule;

function assertIos() {
  if (Platform.OS !== 'ios') {
    throw new Error('iCloud se usa solo en iOS.');
  }
}

let cloudStoreModule: CloudStoreModule | null = null;

function getCloudStore() {
  assertIos();

  if (cloudStoreModule) {
    return cloudStoreModule;
  }

  try {
    cloudStoreModule = require('react-native-cloud-store');
    return cloudStoreModule;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'El módulo nativo no está disponible.';
    throw new Error(
      'iCloud no está enlazado en esta build. Reconstruye la app iOS después de ejecutar pod install. ' +
        detail
    );
  }
}

function stripFileScheme(uri: string) {
  return uri.replace(/^file:\/\//, '');
}

async function getBackupPaths() {
  const { getDefaultICloudContainerPath } = getCloudStore();
  const containerPath = await getDefaultICloudContainerPath();

  if (!containerPath) {
    throw new Error('No se encontró el contenedor de iCloud.');
  }

  const backupDir = `${containerPath}/${BACKUP_DIR_NAME}`;
  return {
    backupDir,
    base64Path: `${backupDir}/${BACKUP_BASE64_FILE_NAME}`,
    databasePath: `${backupDir}/${BACKUP_FILE_NAME}`,
    metadataPath: `${backupDir}/${METADATA_FILE_NAME}`,
  };
}

async function ensureBackupDir(path: string) {
  const { createDir, exist } = getCloudStore();

  if (!(await exist(path))) {
    await createDir(path);
  }
}

function parseMetadata(raw: string): BackupFileMetadata {
  const metadata = JSON.parse(raw) as BackupFileMetadata;
  return {
    app: 'Cash IO',
    databaseName: 'cashio.db',
    createdAt: metadata.createdAt,
    hash: metadata.hash,
    size: metadata.size,
  };
}

export const icloudBackupProvider: BackupProvider = {
  id: 'icloud',
  label: 'iCloud',
  async connect() {
    const { isICloudAvailable } = getCloudStore();
    const available = await isICloudAvailable();

    if (!available) {
      throw new Error('iCloud no está disponible para Cash IO.');
    }

    const paths = await getBackupPaths();
    await ensureBackupDir(paths.backupDir);
  },
  async disconnect() {
    return;
  },
  async isAvailable() {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      const { isICloudAvailable } = getCloudStore();
      return isICloudAvailable();
    } catch {
      return false;
    }
  },
  async upload(backup: CloudBackup) {
    const { exist, unlink, upload, writeFile } = getCloudStore();

    if (!backup.localUri) {
      throw new Error('No se encontró el archivo local para subir.');
    }

    const paths = await getBackupPaths();
    await ensureBackupDir(paths.backupDir);

    if (await exist(paths.databasePath)) {
      await unlink(paths.databasePath);
    }

    await upload(stripFileScheme(backup.localUri), paths.databasePath);
    await writeFile(paths.base64Path, backup.databaseBase64, { override: true });
    await writeFile(paths.metadataPath, JSON.stringify(backup.metadata), { override: true });
  },
  async downloadLatest() {
    const { download, exist, readFile } = getCloudStore();
    const paths = await getBackupPaths();

    if (
      !(await exist(paths.databasePath)) ||
      !(await exist(paths.base64Path)) ||
      !(await exist(paths.metadataPath))
    ) {
      return null;
    }

    await download(paths.databasePath);
    await download(paths.base64Path);

    const metadata = parseMetadata(await readFile(paths.metadataPath));
    const databaseBase64 = await readFile(paths.base64Path);

    return {
      databaseBase64,
      localUri: null,
      metadata,
    };
  },
};
