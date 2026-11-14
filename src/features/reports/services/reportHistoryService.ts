import { ApiError, apiClient } from 'shared/services/apiClient';

import type {
  ReportDownloadLink,
  ReportHistoryItem,
  ReportHistoryPage,
} from '../domain/report.types';
import {
  hasMorePages,
  REPORT_HISTORY_PAGE_SIZE,
} from '../domain/reportHistory';

export function isReportNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 404 &&
    error.code === 'REPORT_NOT_FOUND'
  );
}

// No userId: the backend scopes the history to the token's owner and refuses
// the field with 400.
export async function fetchReportHistory(
  idToken: string,
  page = 1,
  limit = REPORT_HISTORY_PAGE_SIZE,
): Promise<ReportHistoryPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const items = await apiClient.get<ReportHistoryItem[]>(
    `/reports?${query.toString()}`,
    { token: idToken },
  );

  return { items, hasMore: hasMorePages(items.length, limit) };
}

export function fetchReportDownloadLink(
  idToken: string,
  reportId: string,
): Promise<ReportDownloadLink> {
  return apiClient.get<ReportDownloadLink>(
    `/reports/${encodeURIComponent(reportId)}/file`,
    { token: idToken },
  );
}

// A report already gone (deleted on another device) is what the person asked
// for, so a 404 counts as deleted.
export async function deleteReport(
  idToken: string,
  reportId: string,
): Promise<void> {
  try {
    await apiClient.delete<void>(`/reports/${encodeURIComponent(reportId)}`, {
      token: idToken,
    });
  } catch (error) {
    if (!isReportNotFound(error)) {
      throw error;
    }
  }
}
