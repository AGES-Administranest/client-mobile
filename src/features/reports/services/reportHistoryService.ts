import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { apiClient } from 'shared/services/apiClient';

import {
  sectionsOf,
  type GeneratedReport,
  type ReportCategory,
  type ReportHistoryItem,
} from '../domain/report.types';

// A long period draws many pages on the server.
export const GENERATE_TIMEOUT_MS = 60_000;

// Without a limit a stalled download would keep the sheet busy for good.
export const DOWNLOAD_TIMEOUT_MS = 60_000;

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

// Stand-in until the history endpoint exists (US32): no report at all, never
// made-up ones. Keeps the signature the real call will have, GET /reports.
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
 * Saves the PDF on the device, so it can be shared later without a
 * connection (US31). The download link is already signed: it needs no token.
 */
export async function saveReport(
  report: GeneratedReport,
): Promise<ReportHistoryItem> {
  const item: ReportHistoryItem = {
    id: report.id,
    fileName: report.fileName,
    generatedAt: report.generatedAt,
  };

  try {
    if (Platform.OS === 'web') {
      // The signed URL sends an attachment; using this tab avoids popup
      // blocking after a slow generation and keeps the app open.
      await WebBrowser.openBrowserAsync(report.downloadUrl, {
        windowName: '_self',
      });
      return item;
    }

    return { ...item, fileUri: await downloadReport(report) };
  } catch (error) {
    throw new ReportDownloadError(error);
  }
}

async function downloadReport(report: GeneratedReport): Promise<string> {
  // The file name only tells the period: two reports of the same period
  // would overwrite each other without a folder of their own.
  const directory = new Directory(Paths.document, 'reports', report.id);
  directory.create({ intermediates: true, idempotent: true });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const file = await File.downloadFileAsync(
      report.downloadUrl,
      new File(directory, report.fileName),
      { idempotent: true, signal: controller.signal },
    );
    return file.uri;
  } finally {
    clearTimeout(timer);
  }
}

export async function shareReport(fileUri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });

  return true;
}
