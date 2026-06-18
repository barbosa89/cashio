import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { runOpportunisticBackup } from '@/lib/backup/backup-service';
import { getBackupMetadata } from '@/lib/backup/storage';

export const CASHIO_BACKUP_TASK_NAME = 'cashio-daily-backup';

TaskManager.defineTask(CASHIO_BACKUP_TASK_NAME, async () => {
  try {
    await runOpportunisticBackup();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function syncBackupTaskRegistration() {
  if (Platform.OS === 'web') {
    return false;
  }

  const metadata = await getBackupMetadata();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(CASHIO_BACKUP_TASK_NAME);

  if (!metadata.enabled || !metadata.provider) {
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(CASHIO_BACKUP_TASK_NAME);
    }
    return false;
  }

  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(CASHIO_BACKUP_TASK_NAME, {
      minimumInterval: 24 * 60,
    });
  }

  return true;
}
