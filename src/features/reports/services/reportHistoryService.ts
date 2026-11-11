import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ReportCategory, ReportHistoryItem } from '../domain/report.types';

// Stand-in until the report endpoints exist: no report at all, never made-up
// ones. Keeps the signature the real call will have, GET /reports.
export function fetchReportHistory(
  _idToken: string,
): Promise<ReportHistoryItem[]> {
  return Promise.resolve([]);
}

export type GenerateReportInput = {
  categories: readonly ReportCategory[];
  from: string;
  to: string;
};

// Stand-in until POST /reports exists: it should return the generated file.
// Until then a placeholder text file (no real data) is saved on the device so
// the share flow can be exercised end to end.
export function generateReport(
  _idToken: string,
  input: GenerateReportInput,
): Promise<ReportHistoryItem> {
  const generatedAt = new Date().toISOString();
  const fileName = `relatorio_${input.from}_${input.to}.txt`;
  const item: ReportHistoryItem = { id: generatedAt, fileName, generatedAt };

  try {
    const file = new File(Paths.document, fileName);
    file.create({ overwrite: true });
    file.write(
      `Relatório provisório\nPeríodo: ${input.from} a ${
        input.to
      }\nCategorias: ${input.categories.join(', ')}\n`,
    );
    item.fileUri = file.uri;
  } catch {
    // No file system (web): the entry still goes to the history, just unshareable.
  }

  return Promise.resolve(item);
}

export async function shareReport(fileUri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    UTI: 'public.plain-text',
  });

  return true;
}
