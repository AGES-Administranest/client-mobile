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

// Stand-in until POST /reports exists: it should return the generated file, to
// be saved on the device with expo-file-system. Until then nothing is
// downloaded, only the history entry is produced.
export function generateReport(
  _idToken: string,
  input: GenerateReportInput,
): Promise<ReportHistoryItem> {
  const generatedAt = new Date().toISOString();

  return Promise.resolve({
    id: generatedAt,
    fileName: `relatorio_${input.from}_${input.to}.pdf`,
    generatedAt,
  });
}
