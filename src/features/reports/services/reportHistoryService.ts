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

/** Generating a long period draws many pages on the server. */
export const GENERATE_TIMEOUT_MS = 60_000;

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

/**
 * Generates the PDF of the general report (POST /reports, US28) and saves it
 * on the device, so it can be shared later without a connection (US31).
 *
 * The download link is already signed: it needs no token.
 */
export async function generateReport(
  idToken: string,
  input: GenerateReportInput,
): Promise<ReportHistoryItem> {
  const report = await apiClient.post<GeneratedReport>(
    '/reports',
    { from: input.from, to: input.to, sections: sectionsOf(input.categories) },
    { token: idToken, timeoutMs: GENERATE_TIMEOUT_MS },
  );
  const item: ReportHistoryItem = {
    id: report.id,
    fileName: report.fileName,
    generatedAt: report.generatedAt,
  };

  if (Platform.OS === 'web') {
    // The signed URL sends an attachment; using this tab avoids popup blocking
    // after a slow generation and keeps the app open while the file downloads.
    await WebBrowser.openBrowserAsync(report.downloadUrl, {
      windowName: '_self',
    });
    return item;
  }

  const directory = new Directory(Paths.document, 'reports');
  directory.create({ intermediates: true, idempotent: true });
  const file = await File.downloadFileAsync(
    report.downloadUrl,
    new File(directory, report.fileName),
    // The same period generated again replaces the older file.
    { idempotent: true },
  );

  return { ...item, fileUri: file.uri };
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
