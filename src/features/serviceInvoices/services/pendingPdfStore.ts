import { Directory, File, Paths } from 'expo-file-system';

import { registerLocalDataCleaner } from 'shared/services/localData';

const ROOT_NAME = 'service-invoices';

// The document directory, not the cache: the system may empty the cache, and
// a note typed offline has no other copy of its PDF until it syncs.
function directoryOf(userId: string): Directory {
  return new Directory(Paths.document, ROOT_NAME, userId);
}

registerLocalDataCleaner(() => {
  const root = new Directory(Paths.document, ROOT_NAME);
  if (root.exists) root.delete();
});

function fileOf(userId: string, invoiceId: string): File {
  return new File(directoryOf(userId), `${invoiceId}.pdf`);
}

export function savePendingPdf(
  userId: string,
  invoiceId: string,
  bytes: Uint8Array,
): void {
  directoryOf(userId).create({ idempotent: true, intermediates: true });
  const file = fileOf(userId, invoiceId);
  if (!file.exists) file.create();
  file.write(bytes);
}

/** The uri is what native uploads from; the bytes are what the hash is taken of. */
export type PendingPdf = { uri: string; bytes: Uint8Array };

/** null when the file is gone (cleared app data, a failed save). */
export async function readPendingPdf(
  userId: string,
  invoiceId: string,
): Promise<PendingPdf | null> {
  const file = fileOf(userId, invoiceId);
  return file.exists ? { uri: file.uri, bytes: await file.bytes() } : null;
}

export function removePendingPdf(userId: string, invoiceId: string): void {
  const file = fileOf(userId, invoiceId);
  if (file.exists) file.delete();
}
