import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAppErrorDescriptor } from '@/i18n/errors';
import type { BackupMetadata } from '@/lib/backup/types';

const BACKUP_METADATA_KEY = 'cashio.backup.metadata.v1';
const RESTORE_PROMPT_SEEN_KEY = 'cashio.restorePromptSeen.v1';

const DEFAULT_METADATA: BackupMetadata = {
  enabled: false,
  provider: null,
  lastBackupAt: null,
  lastRestoreAt: null,
  lastError: null,
};

export async function getBackupMetadata(): Promise<BackupMetadata> {
  const raw = await AsyncStorage.getItem(BACKUP_METADATA_KEY);

  if (!raw) {
    return DEFAULT_METADATA;
  }

  try {
    const stored = JSON.parse(raw) as Partial<BackupMetadata> & {
      lastError?: BackupMetadata['lastError'] | string;
    };
    return {
      ...DEFAULT_METADATA,
      ...stored,
      lastError: isAppErrorDescriptor(stored.lastError)
        ? stored.lastError
        : stored.lastError
          ? { code: 'generic' }
          : null,
    };
  } catch {
    return DEFAULT_METADATA;
  }
}

export async function setBackupMetadata(metadata: BackupMetadata) {
  await AsyncStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));
}

export async function updateBackupMetadata(
  updater: (metadata: BackupMetadata) => BackupMetadata
) {
  const metadata = await getBackupMetadata();
  const nextMetadata = updater(metadata);
  await setBackupMetadata(nextMetadata);
  return nextMetadata;
}

export async function hasSeenRestorePrompt() {
  return (await AsyncStorage.getItem(RESTORE_PROMPT_SEEN_KEY)) === 'true';
}

export async function markRestorePromptSeen() {
  await AsyncStorage.setItem(RESTORE_PROMPT_SEEN_KEY, 'true');
}
