import * as Crypto from 'expo-crypto';

import { InvoiceDocument, PickedFile } from '../domain/invoiceDocument';

/**
 * Completes a picked file with what the upload needs: the id the invoice will
 * carry, its size and its SHA-256.
 *
 * The id is generated here, not by the API (ADR-09): the app owns it, so a
 * retry of the same upload reuses it instead of leaving a second draft behind.
 */
export async function describeDocument(
  file: PickedFile,
): Promise<InvoiceDocument> {
  return {
    ...file,
    id: Crypto.randomUUID(),
    // The bytes we hashed are the bytes we upload, and the presigned policy
    // pins this exact number — so it has to come from the file itself, never
    // from picker metadata.
    sizeBytes: file.bytes.length,
    hash: await sha256Hex(file.bytes),
  };
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
