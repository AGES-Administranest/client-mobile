import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { removePendingPdf, savePendingPdf } from './pendingPdfStore';
import {
  toPendingServiceInvoice,
  type PendingServiceInvoice,
  type ReadingDifference,
} from '../domain/offlineServiceInvoices';
import type { ServiceInvoiceInput } from '../domain/serviceInvoice.types';

// Everything is per user: whoever signs in next on the same device sees
// neither the notes nor the PDFs of the one who left.
const PREFIX = '@administranest:service-invoices';
const outboxKey = (userId: string) => `${PREFIX}:${userId}:outbox`;
const differencesKey = (userId: string) => `${PREFIX}:${userId}:differences`;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Tells whoever shows the pending notes, or sends them, that the queue changed. */
export function subscribeOfflineServiceInvoices(
  listener: Listener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineServiceInvoicesChanged(): void {
  listeners.forEach(listener => listener());
}

// An unreadable queue is not an empty one: swallowing the error here would
// make the next save overwrite notes that are still on the device.
async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadServiceInvoiceOutbox(
  userId: string,
): Promise<PendingServiceInvoice[]> {
  return readJson<PendingServiceInvoice[]>(outboxKey(userId), []);
}

export async function saveServiceInvoiceOutbox(
  userId: string,
  queue: PendingServiceInvoice[],
): Promise<void> {
  await writeJson(outboxKey(userId), queue);
}

/** Lowercase hex, which is the shape the backend validates. */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes,
  );
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

type ManualPdf = { bytes: Uint8Array; name: string; mimeType: string };

/**
 * Keeps a note typed without a connection: its PDF on disk and its data in the
 * queue. The PDF goes first, so a queued note never points at a missing file.
 */
export async function queueManualServiceInvoice(
  userId: string,
  input: ServiceInvoiceInput,
  pdf: ManualPdf,
): Promise<PendingServiceInvoice> {
  const id = Crypto.randomUUID();
  const file = {
    name: pdf.name,
    mimeType: pdf.mimeType,
    bytesSize: pdf.bytes.length,
    hash: await sha256Hex(pdf.bytes),
  };
  savePendingPdf(userId, id, pdf.bytes);

  const invoice = toPendingServiceInvoice(
    id,
    input,
    file,
    new Date().toISOString(),
  );
  try {
    const queue = await loadServiceInvoiceOutbox(userId);
    await saveServiceInvoiceOutbox(userId, [...queue, invoice]);
  } catch (error) {
    removePendingPdf(userId, id);
    throw error;
  }
  notifyOfflineServiceInvoicesChanged();
  return invoice;
}

export async function markServiceInvoiceRejected(
  userId: string,
  invoiceId: string,
  code: string | null,
): Promise<void> {
  const queue = await loadServiceInvoiceOutbox(userId);
  await saveServiceInvoiceOutbox(
    userId,
    queue.map(invoice =>
      invoice.id === invoiceId
        ? { ...invoice, rejection: { code, acknowledged: false } }
        : invoice,
    ),
  );
  notifyOfflineServiceInvoicesChanged();
}

export async function acknowledgeServiceInvoiceRejection(
  userId: string,
  invoiceId: string,
): Promise<void> {
  const queue = await loadServiceInvoiceOutbox(userId);
  await saveServiceInvoiceOutbox(
    userId,
    queue.map(invoice =>
      invoice.id === invoiceId && invoice.rejection
        ? {
            ...invoice,
            rejection: { ...invoice.rejection, acknowledged: true },
          }
        : invoice,
    ),
  );
  notifyOfflineServiceInvoicesChanged();
}

/** Drops a synced note from the queue and its PDF from the disk. */
export async function removeSyncedServiceInvoice(
  userId: string,
  invoiceId: string,
): Promise<void> {
  const queue = await loadServiceInvoiceOutbox(userId);
  await saveServiceInvoiceOutbox(
    userId,
    queue.filter(invoice => invoice.id !== invoiceId),
  );
  removePendingPdf(userId, invoiceId);
  notifyOfflineServiceInvoicesChanged();
}

export function loadReadingDifferences(
  userId: string,
): Promise<ReadingDifference[]> {
  return readJson<ReadingDifference[]>(differencesKey(userId), []);
}

export async function saveReadingDifference(
  userId: string,
  difference: ReadingDifference,
): Promise<void> {
  const current = await loadReadingDifferences(userId);
  await writeJson(differencesKey(userId), [
    ...current.filter(item => item.invoiceId !== difference.invoiceId),
    difference,
  ]);
}

export type DiscardResult = { pdfRemoved: boolean };

/**
 * The note leaves the queue even when its PDF cannot be deleted: a file left
 * behind is the lesser problem, and the caller is told so it can say it.
 */
export async function discardServiceInvoice(
  userId: string,
  invoiceId: string,
): Promise<DiscardResult> {
  const queue = await loadServiceInvoiceOutbox(userId);
  await saveServiceInvoiceOutbox(
    userId,
    queue.filter(invoice => invoice.id !== invoiceId),
  );
  notifyOfflineServiceInvoicesChanged();

  try {
    removePendingPdf(userId, invoiceId);
    return { pdfRemoved: true };
  } catch {
    return { pdfRemoved: false };
  }
}
