import type { ReportHistoryItem } from '../domain/report.types';

// Stand-in until the report endpoints exist: no report at all, never made-up
// ones. Keeps the signature the real call will have, GET /reports.
export function fetchReportHistory(
  _idToken: string,
): Promise<ReportHistoryItem[]> {
  return Promise.resolve([]);
}
