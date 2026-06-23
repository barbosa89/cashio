import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { MonthlyReportFile } from '@/lib/report-csv';

export async function exportMonthlyReportFile({ contents, fileName }: MonthlyReportFile) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('La función de compartir archivos no está disponible en este dispositivo.');
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Exportar reporte CSV',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
