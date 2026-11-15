import { ApiError } from 'shared/services/apiClient';

import {
  loadPendingInvoiceDeletions,
  notifyOfflineServiceInvoicesChanged,
  removePendingInvoiceDeletion,
} from './offlineServiceInvoiceStore';
import { deleteConfirmedServiceInvoice } from './serviceInvoiceRecordService';

function isAlreadyGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export async function syncPendingInvoiceDeletions(
  idToken: string,
  userId: string,
): Promise<number> {
  const queued = await loadPendingInvoiceDeletions(userId);
  let sent = 0;

  for (const invoiceId of queued) {
    try {
      await deleteConfirmedServiceInvoice(idToken, invoiceId);
    } catch (error) {
      if (!isAlreadyGone(error)) break;
    }
    await removePendingInvoiceDeletion(userId, invoiceId);
    sent += 1;
  }

  if (sent > 0) notifyOfflineServiceInvoicesChanged();
  return sent;
}
