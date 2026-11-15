import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { registerLocalDataCleaner } from 'shared/services/localData';

const ROOT_NAME = 'reports';

// Without a limit a stalled download would keep the sheet busy for good.
export const DOWNLOAD_TIMEOUT_MS = 60_000;

// The web build has no document directory: there the file is only downloaded
// by the browser, never kept by the app.
export const canKeepReportFiles = Platform.OS !== 'web';

type NamedReport = { id: string; fileName: string };

export type LocalReportFile = {
  uri: string;
  name: string;
};

// The document directory, not the cache: the system may empty the cache, and
// the copy is what lets a report open without a connection. A folder for each
// report, because the file name only tells the period: two reports of the same
// period would overwrite each other.
function directoryOf(userId: string, reportId: string): Directory {
  return new Directory(Paths.document, ROOT_NAME, userId, reportId);
}

registerLocalDataCleaner(() => {
  if (!canKeepReportFiles) {
    return;
  }

  const root = new Directory(Paths.document, ROOT_NAME);
  if (root.exists) root.delete();
});

function toLocal(file: File, report: NamedReport): LocalReportFile {
  return { uri: file.uri, name: report.fileName };
}

export function findLocalReport(
  userId: string,
  report: NamedReport,
): LocalReportFile | null {
  if (!canKeepReportFiles) {
    return null;
  }

  try {
    const file = new File(directoryOf(userId, report.id), report.fileName);
    return file.exists ? toLocal(file, report) : null;
  } catch {
    return null;
  }
}

export async function saveReportFile(
  userId: string,
  report: NamedReport,
  url: string,
): Promise<LocalReportFile> {
  const directory = directoryOf(userId, report.id);
  directory.create({ idempotent: true, intermediates: true });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const file = await File.downloadFileAsync(
      url,
      new File(directory, report.fileName),
      { idempotent: true, signal: controller.signal },
    );
    return toLocal(file, report);
  } finally {
    clearTimeout(timer);
  }
}

export function removeReportFile(userId: string, reportId: string): void {
  if (!canKeepReportFiles) {
    return;
  }

  const directory = directoryOf(userId, reportId);
  if (directory.exists) {
    directory.delete();
  }
}
