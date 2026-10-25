import { resolveLocalClientId } from 'features/clients';
import { ApiError } from 'shared/services/apiClient';

import {
  loadServiceInvoiceOutbox,
  markServiceInvoiceRejected,
  notifyOfflineServiceInvoicesChanged,
  removeSyncedServiceInvoice,
  saveReadingDifference,
} from './offlineServiceInvoiceStore';
import { readPendingPdf } from './pendingPdfStore';
import {
  requestServiceInvoiceUpload,
  sendServiceInvoicePdf,
  syncServiceInvoices,
} from './serviceInvoiceService';
import {
  CLIENT_NOT_SYNCED,
  PENDING_FILE_MISSING,
  nextToSend,
  readingDifference,
  toSyncItem,
  type PendingServiceInvoice,
} from '../domain/offlineServiceInvoices';

export type ServiceInvoiceSyncOutcome = {
  synced: number;
  rejected: number;
  pending: number;
};

type ClientIdCheck =
  | { status: 'ready'; clientId: string }
  | { status: 'pending' }
  | { status: 'missing' };

// A note can point at a taker registered offline. It only goes after that
// taker (whose queue runs first), with the real id in place of the local one;
// if the taker was refused, the note has nowhere to go.
async function checkClientId(
  userId: string,
  invoice: PendingServiceInvoice,
): Promise<ClientIdCheck> {
  const resolution = await resolveLocalClientId(userId, invoice.clientId);
  return resolution.status === 'resolved'
    ? { status: 'ready', clientId: resolution.clientId }
    : resolution;
}

// Same rule as the appointment queue: only a 4xx about the data is final.
// No network, an expired token, a rate limit or a server error try again
// later with the queue untouched.
function isPermanentRejection(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

type SendOutcome = { status: 'sent' } | { status: 'refused'; code: string };

async function send(
  idToken: string,
  userId: string,
  invoice: PendingServiceInvoice,
  clientId: string,
): Promise<SendOutcome> {
  const bytes = await readPendingPdf(userId, invoice.id);
  if (!bytes) return { status: 'refused', code: PENDING_FILE_MISSING };

  // The file first, as in backend #71, where the draft is born in `upload-url`
  // with the app's id. Both steps are safe to repeat for the same id.
  const target = await requestServiceInvoiceUpload(idToken, invoice.id, {
    filename: invoice.file.name,
    fileMimeType: invoice.file.mimeType,
    fileHash: invoice.file.hash,
    fileBytesSize: invoice.file.bytesSize,
  });
  await sendServiceInvoicePdf(target, bytes);

  const [result] = await syncServiceInvoices(idToken, [
    toSyncItem(invoice, clientId),
  ]);
  if (!result || result.status === 'conflict') {
    return { status: 'refused', code: result?.code ?? 'UNKNOWN' };
  }

  // What the typed data says is never overwritten by what the PDF says: a
  // difference is only kept, for the person to confirm.
  const difference = readingDifference(invoice, result.reading);
  if (difference) await saveReadingDifference(userId, difference);
  return { status: 'sent' };
}

async function run(
  idToken: string,
  userId: string,
): Promise<ServiceInvoiceSyncOutcome> {
  let synced = 0;
  let rejected = 0;
  const attempted = new Set<string>();

  for (;;) {
    const queue = await loadServiceInvoiceOutbox(userId);
    const next = nextToSend(queue, attempted);
    if (!next) break;
    attempted.add(next.id);

    const client = await checkClientId(userId, next);
    if (client.status === 'pending') continue;
    if (client.status === 'missing') {
      await markServiceInvoiceRejected(userId, next.id, CLIENT_NOT_SYNCED);
      rejected += 1;
      continue;
    }

    try {
      const outcome = await send(idToken, userId, next, client.clientId);
      if (outcome.status === 'sent') {
        await removeSyncedServiceInvoice(userId, next.id);
        synced += 1;
      } else {
        await markServiceInvoiceRejected(userId, next.id, outcome.code);
        rejected += 1;
      }
    } catch (error) {
      if (!isPermanentRejection(error)) break;
      await markServiceInvoiceRejected(userId, next.id, error.code);
      rejected += 1;
    }
  }

  if (synced > 0 || rejected > 0) {
    notifyOfflineServiceInvoicesChanged();
  }

  return {
    synced,
    rejected,
    pending: (await loadServiceInvoiceOutbox(userId)).filter(
      invoice => !invoice.rejection,
    ).length,
  };
}

let running: Promise<ServiceInvoiceSyncOutcome> | null = null;

/** Sends the queue in order. Simultaneous calls wait for the same run. */
export function syncPendingServiceInvoices(
  idToken: string,
  userId: string,
): Promise<ServiceInvoiceSyncOutcome> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}
