import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ReportHistoryItem } from '../domain/report.types';

// The web build has no document directory: there the file is only downloaded
// by the browser, never kept by the app.
export const canKeepReportFiles = Platform.OS !== 'web';

// The document directory, not the cache: the system may empty the cache, and
// the copy is what lets a report open without a connection.
function directoryOf(userId: string, reportId: string): Directory {
  return new Directory(Paths.document, 'reports', userId, reportId);
}

function fileNameOf(report: Pick<ReportHistoryItem, 'id' | 'fileName'>) {
  return report.fileName ?? `${report.id}.pdf`;
}

export type LocalReportFile = {
  uri: string;
  contentUri: string;
};

function toLocal(file: File): LocalReportFile {
  return { uri: file.uri, contentUri: file.contentUri };
}

export function findLocalReport(
  userId: string,
  report: Pick<ReportHistoryItem, 'id' | 'fileName'>,
): LocalReportFile | null {
  if (!canKeepReportFiles) {
    return null;
  }

  try {
    const file = new File(directoryOf(userId, report.id), fileNameOf(report));
    return file.exists ? toLocal(file) : null;
  } catch {
    return null;
  }
}
