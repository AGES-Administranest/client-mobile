import type { ReportHistoryItem } from './report.types';

export const REPORT_HISTORY_PAGE_SIZE = 20;

// GET /reports sends no total: a page shorter than the limit is the last one.
export function hasMorePages(received: number, limit: number): boolean {
  return received >= limit;
}

function newestFirst(a: ReportHistoryItem, b: ReportHistoryItem): number {
  const byDate = Date.parse(b.generatedAt) - Date.parse(a.generatedAt);

  return byDate !== 0 ? byDate : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// A report deleted while paging shifts the next page by one, so the same
// report can come twice; the list keeps one copy, newest generation first.
export function mergeReportPages(
  known: readonly ReportHistoryItem[],
  incoming: readonly ReportHistoryItem[],
): ReportHistoryItem[] {
  const byId = new Map<string, ReportHistoryItem>();

  for (const report of [...known, ...incoming]) {
    byId.set(report.id, report);
  }

  return [...byId.values()].sort(newestFirst);
}
