import { apiClient } from 'shared/services/apiClient';

import type {
  ReportHistoryItem,
  ReportHistoryPage,
} from '../domain/report.types';
import {
  hasMorePages,
  REPORT_HISTORY_PAGE_SIZE,
} from '../domain/reportHistory';

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
