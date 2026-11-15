import { ApiError, apiClient } from 'shared/services/apiClient';

import { downloadInBrowser } from './reportFileOpener';
import { canKeepReportFiles, saveReportFile } from './reportFileStore';
import {
  sectionsOf,
  type GeneratedReport,
  type ReportCategory,
  type ReportDownloadLink,
  type ReportHistoryItem,
  type ReportHistoryPage,
} from '../domain/report.types';
import {
  hasMorePages,
  REPORT_HISTORY_PAGE_SIZE,
} from '../domain/reportHistory';

// A long period draws many pages on the server.
export const GENERATE_TIMEOUT_MS = 60_000;

/**
 * The report exists on the server, but its PDF did not reach the device:
 * downloading again is enough, generating again would make a second report.
 */
export class ReportDownloadError extends Error {
  constructor(cause: unknown) {
    super('The report PDF could not be downloaded', { cause });
    this.name = 'ReportDownloadError';
  }
}

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

export type GenerateReportInput = {
  categories: readonly ReportCategory[];
  from: string;
  to: string;
};

export function createReport(
  idToken: string,
  input: GenerateReportInput,
): Promise<GeneratedReport> {
  return apiClient.post<GeneratedReport>(
    '/reports',
    { from: input.from, to: input.to, sections: sectionsOf(input.categories) },
    { token: idToken, timeoutMs: GENERATE_TIMEOUT_MS },
  );
}

/**
 * Saves the PDF on the device, so it can be opened later without a
 * connection (US31). The download link is already signed: it needs no token.
 */
export async function saveReport(
  userId: string,
  report: GeneratedReport,
): Promise<ReportHistoryItem> {
  try {
    if (canKeepReportFiles) {
      await saveReportFile(userId, report, report.downloadUrl);
    } else {
      await downloadInBrowser(report.downloadUrl);
    }
  } catch (error) {
    throw new ReportDownloadError(error);
  }

  return {
    id: report.id,
    kind: report.kind,
    fileName: report.fileName,
    fileBytesSize: null,
    period: report.period,
    generatedAt: report.generatedAt,
  };
}
