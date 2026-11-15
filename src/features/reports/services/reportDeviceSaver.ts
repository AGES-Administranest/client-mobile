import { Directory, File } from 'expo-file-system';

import type { LocalReportFile } from './reportFileStore';

export type DeviceSaveResult = 'saved' | 'cancelled';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
};

/**
 * Copies the app's own copy of a report to a folder the person picks (US31).
 * The system picker is the storage permission: on Android it asks to let the
 * app write to that folder. The bytes come from the local copy, so saving
 * works without a connection.
 */
export async function saveReportToDevice(
  file: LocalReportFile,
): Promise<DeviceSaveResult> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return 'cancelled';
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const target = directory.createFile(file.name, MIME_TYPES[extension] ?? null);
  target.write(new File(file.uri).bytesSync());

  return 'saved';
}
