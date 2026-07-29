import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppError } from '@/i18n/errors';
import type { MonthlyReportFile } from '@/lib/report-csv';

export async function exportMonthlyReportFile({ contents, fileName, shareTitle }: MonthlyReportFile) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError({ code: 'shareUnavailable' });
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: shareTitle,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
