import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { AppError } from '@/i18n/errors';
import type { BackupFileMetadata, BackupProvider, CloudBackup } from '@/lib/backup/types';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FILE_NAME = 'cashio.db';

type DriveFile = {
  id: string;
  name: string;
  appProperties?: Partial<Record<keyof BackupFileMetadata, string>>;
  modifiedTime?: string;
  size?: string;
};

function assertAndroid() {
  if (Platform.OS !== 'android') {
    throw new AppError({ code: 'driveAndroidOnly' });
  }
}

function configureGoogle() {
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
  });
}

async function getAccessToken() {
  configureGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const silentResponse = await GoogleSignin.signInSilently();
  if (silentResponse.type === 'noSavedCredentialFound') {
    const signInResponse = await GoogleSignin.signIn();
    if (signInResponse.type !== 'success') {
      throw new AppError({ code: 'signInCancelled' });
    }
  }

  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

async function driveFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(
      { code: 'generic' },
      {
        cause: new Error(body || `Google Drive responded with status ${response.status}.`),
      }
    );
  }

  return response.json() as Promise<T>;
}

function metadataToAppProperties(metadata: BackupFileMetadata) {
  return {
    app: metadata.app,
    databaseName: metadata.databaseName,
    createdAt: metadata.createdAt,
    hash: metadata.hash,
    size: String(metadata.size),
  };
}

function metadataFromDriveFile(file: DriveFile, databaseBase64: string): BackupFileMetadata {
  const appProperties = file.appProperties ?? {};

  return {
    app: 'Cash IO',
    databaseName: BACKUP_FILE_NAME,
    createdAt: appProperties.createdAt ?? file.modifiedTime ?? new Date().toISOString(),
    hash: appProperties.hash ?? '',
    size: Number(appProperties.size ?? file.size ?? databaseBase64.length),
  };
}

async function findLatestBackup(token: string) {
  const query = [
    `name = '${BACKUP_FILE_NAME}'`,
    `'appDataFolder' in parents`,
    'trashed = false',
  ].join(' and ');
  const params = new URLSearchParams({
    fields: 'files(id,name,appProperties,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    q: query,
    spaces: 'appDataFolder',
  });
  const response = await driveFetch<{ files: DriveFile[] }>(
    `${DRIVE_API}/files?${params.toString()}`,
    token
  );

  return response.files[0] ?? null;
}

async function setDriveMetadata(fileId: string, token: string, metadata: BackupFileMetadata) {
  await driveFetch<DriveFile>(`${DRIVE_API}/files/${fileId}`, token, {
    body: JSON.stringify({
      appProperties: metadataToAppProperties(metadata),
      name: BACKUP_FILE_NAME,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  });
}

async function createDriveFile(token: string, metadata: BackupFileMetadata) {
  const file = await driveFetch<DriveFile>(`${DRIVE_API}/files?fields=id,name`, token, {
    body: JSON.stringify({
      appProperties: metadataToAppProperties(metadata),
      name: BACKUP_FILE_NAME,
      parents: ['appDataFolder'],
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return file.id;
}

async function updateDriveFile(fileId: string, token: string, localUri: string) {
  const uploadResult = await FileSystem.uploadAsync(
    `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media&fields=id,name`,
    localUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-sqlite3',
      },
      httpMethod: 'PATCH',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    }
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new AppError(
      { code: 'generic' },
      {
        cause: new Error(
          uploadResult.body || `Google Drive responded with status ${uploadResult.status}.`
        ),
      }
    );
  }
}

export const googleDriveBackupProvider: BackupProvider = {
  id: 'google-drive',
  label: 'Google Drive',
  async connect() {
    assertAndroid();
    await getAccessToken();
  },
  async disconnect() {
    configureGoogle();
    await GoogleSignin.signOut();
  },
  async isAvailable() {
    return Platform.OS === 'android';
  },
  async upload(backup: CloudBackup) {
    assertAndroid();

    if (!backup.localUri) {
      throw new AppError({ code: 'localFileMissing' });
    }

    const token = await getAccessToken();
    const existingFile = await findLatestBackup(token);
    const fileId = existingFile?.id ?? (await createDriveFile(token, backup.metadata));
    await updateDriveFile(fileId, token, backup.localUri);

    await setDriveMetadata(fileId, token, backup.metadata);
  },
  async downloadLatest() {
    assertAndroid();
    const token = await getAccessToken();
    const latestFile = await findLatestBackup(token);

    if (!latestFile || !FileSystem.cacheDirectory) {
      return null;
    }

    const targetUri = `${FileSystem.cacheDirectory}cashio-drive-restore.db`;
    await FileSystem.downloadAsync(`${DRIVE_API}/files/${latestFile.id}?alt=media`, targetUri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const databaseBase64 = await FileSystem.readAsStringAsync(targetUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      databaseBase64,
      localUri: targetUri,
      metadata: metadataFromDriveFile(latestFile, databaseBase64),
    };
  },
};
