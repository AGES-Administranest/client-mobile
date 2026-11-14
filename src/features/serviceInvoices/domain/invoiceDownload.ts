import type { InvoiceSyncStatus } from './serviceInvoiceRecord.types';

export type DownloadAvailability =
  | 'ready'
  | 'needsConnection'
  | 'notSentYet'
  | 'noFile';

type DownloadContext = {
  hasFile: boolean;
  syncStatus: InvoiceSyncStatus;
  isOnline: boolean;
};

export function downloadAvailability({
  hasFile,
  syncStatus,
  isOnline,
}: DownloadContext): DownloadAvailability {
  if (syncStatus !== 'SYNCED') return 'notSentYet';
  if (!hasFile) return 'noFile';
  return isOnline ? 'ready' : 'needsConnection';
}
