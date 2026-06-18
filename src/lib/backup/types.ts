export type BackupProviderId = 'google-drive' | 'icloud';

export type BackupMetadata = {
  enabled: boolean;
  provider: BackupProviderId | null;
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
  lastError: string | null;
};

export type BackupFileMetadata = {
  app: 'Cash IO';
  databaseName: 'cashio.db';
  createdAt: string;
  hash: string;
  size: number;
};

export type CloudBackup = {
  databaseBase64: string;
  localUri: string | null;
  metadata: BackupFileMetadata;
};

export type BackupProvider = {
  id: BackupProviderId;
  label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isAvailable(): Promise<boolean>;
  upload(backup: CloudBackup): Promise<void>;
  downloadLatest(): Promise<CloudBackup | null>;
};
