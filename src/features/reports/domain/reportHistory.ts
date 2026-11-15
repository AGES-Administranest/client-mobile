import type { ReportHistoryItem } from './report.types';

export const REPORT_HISTORY_PAGE_SIZE = 20;

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

// GET /reports sends no total: a page shorter than the limit is the last one.
export function hasMorePages(received: number, limit: number): boolean {
  return received >= limit;
}

function newestFirst(a: ReportHistoryItem, b: ReportHistoryItem): number {
  const byDate = Date.parse(b.generatedAt) - Date.parse(a.generatedAt);

  return byDate !== 0 ? byDate : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Pages are cut by position, so a report generated meanwhile pushes one that
// is already known into the next page; the list keeps one copy, newest first.
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

// Counted from what the list holds, not from the pages already asked for: a
// report deleted here pulls the rest one position up, and the page after the
// last one asked would skip the report that moved into it.
export function nextHistoryPage(knownCount: number, limit: number): number {
  return Math.floor(knownCount / limit) + 1;
}

// A full page with nothing new would be asked for again without end.
export function bringsNewReports(
  known: readonly ReportHistoryItem[],
  incoming: readonly ReportHistoryItem[],
): boolean {
  const knownIds = new Set(known.map(report => report.id));

  return incoming.some(report => !knownIds.has(report.id));
}

export function withoutReport(
  reports: readonly ReportHistoryItem[],
  id: string,
): ReportHistoryItem[] {
  return reports.filter(report => report.id !== id);
}

// A link that ends while the file is still coming down fails the download, so
// one that has less than this left is treated as already expired.
export const DOWNLOAD_LINK_SAFETY_MS = 30_000;

export function isDownloadLinkUsable(expiresAt: number, now: number): boolean {
  return expiresAt - now > DOWNLOAD_LINK_SAFETY_MS;
}

export type FileSize = {
  value: number;
  unit: 'B' | 'KB' | 'MB';
};

export function toFileSize(bytes: number): FileSize {
  if (bytes < KILOBYTE) {
    return { value: bytes, unit: 'B' };
  }

  if (bytes < MEGABYTE) {
    return { value: Math.round((bytes / KILOBYTE) * 10) / 10, unit: 'KB' };
  }

  return { value: Math.round((bytes / MEGABYTE) * 10) / 10, unit: 'MB' };
}
