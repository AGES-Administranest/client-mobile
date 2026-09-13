import { ApiError, NetworkError, postJson } from 'shared/api';

import { InvoiceDocument, MAX_DOCUMENT_BYTES } from '../domain/invoiceDocument';

/**
 * Sends the document straight to S3 and tells the API about it.
 *
 * The file never goes through our backend (D1): the API only signs a policy,
 * the phone POSTs to the bucket, and then the API verifies with HeadObject what
 * actually landed there (D6). Three steps, and the middle one is the only one
 * that moves bytes.
 */

/** Why an upload could not finish — mapped to a message in the UI. */
export type UploadFailure =
  | 'offline'
  | 'tooLarge'
  | 'duplicateFile'
  | 'notProvisioned'
  | 'uploadRejected'
  | 'notConfirmed'
  | 'unexpected';

export class UploadError extends Error {
  constructor(
    readonly reason: UploadFailure,
    readonly cause?: unknown,
    /** The status S3 answered with, when the bucket is the one refusing. */
    readonly status?: number,
  ) {
    super(reason);
    this.name = 'UploadError';
  }
}

/** What `POST /upload-url` returns: the S3 form, already signed. */
type UploadTarget = {
  url: string;
  fields: Record<string, string>;
  expiresAt: number;
};

type UploadConfirmation = { contentLength: number; contentType: string };

/** The backend's error codes are the contract (ADR-07), not its messages. */
const FAILURE_BY_CODE: Record<string, UploadFailure> = {
  INVOICE_FILE_TOO_LARGE: 'tooLarge',
  PEDIDO_ARQUIVO_DUPLICADO: 'duplicateFile',
  USER_NOT_PROVISIONED: 'notProvisioned',
  PEDIDO_UPLOAD_NAO_CONCLUIDO: 'notConfirmed',
  PEDIDO_UPLOAD_DIVERGENTE: 'notConfirmed',
};

export async function uploadInvoiceDocument(
  document: InvoiceDocument,
): Promise<void> {
  // The API refuses this with a 413 anyway; refusing here saves the round trip
  // and, more to the point, the wait before the user is told.
  if (document.sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new UploadError('tooLarge');
  }

  await sendToBucket(document);
  await confirmUpload(document);
}

async function sendToBucket(document: InvoiceDocument): Promise<void> {
  const target = await requestUploadTarget(document);

  try {
    await postToBucket(target, document);
    return;
  } catch (error) {
    if (!isWorthReissuing(error)) {
      throw error;
    }
  }

  // A policy lives 10 minutes and a mobile upload dies mid-flight for a living.
  // Both are fixed by the same thing: a policy signed now, over the same key —
  // no new draft, nothing already typed is lost (§7.2).
  await postToBucket(await requestUploadTarget(document), document);
}

/**
 * Worth one more try when the upload never got there, or when S3 refused the
 * signature itself (an expired policy answers 403). A 400 means the request
 * broke a condition of the policy — sending it again changes nothing.
 */
function isWorthReissuing(error: unknown): boolean {
  return (
    error instanceof UploadError &&
    (error.reason === 'offline' || error.status === 403)
  );
}

function requestUploadTarget(document: InvoiceDocument): Promise<UploadTarget> {
  return callApi(() =>
    postJson<UploadTarget>(`/stock-entries/${document.id}/upload-url`, {
      filename: document.name,
      fileMimeType: document.mimeType,
      fileHash: document.hash,
      fileBytesSize: document.sizeBytes,
    }),
  );
}

/** The API checks the bucket here; until it answers, nothing is uploaded. */
async function confirmUpload(document: InvoiceDocument): Promise<void> {
  await callApi(() =>
    postJson<UploadConfirmation>(`/stock-entries/${document.id}/uploaded`),
  );
}

async function postToBucket(
  target: UploadTarget,
  document: InvoiceDocument,
): Promise<void> {
  const form = new FormData();
  // Order matters: S3 reads the policy fields as they arrive and stops at the
  // file, ignoring whatever comes after it. The file goes last.
  for (const [name, value] of Object.entries(target.fields)) {
    form.append(name, value);
  }
  form.append('file', filePart(document));

  let response: Response;
  try {
    // No Content-Type header on purpose: fetch has to write the multipart
    // boundary itself, and setting the header by hand loses it.
    response = await fetch(target.url, { method: 'POST', body: form });
  } catch (cause) {
    throw new UploadError('offline', cause);
  }

  // S3 answers 204 No Content when the policy is satisfied.
  if (!response.ok) {
    throw new UploadError('uploadRejected', undefined, response.status);
  }
}

/**
 * On native the part is a descriptor of the file on disk, which React Native
 * streams without ever holding it in JS memory. On web there is no file to
 * point at, so the bytes we already read go up instead.
 */
function filePart(document: InvoiceDocument): Blob {
  if (document.uri) {
    return {
      uri: document.uri,
      name: document.name,
      type: document.mimeType,
    } as unknown as Blob;
  }

  // Only reachable on web, where react-native-web passes the browser's Blob
  // through — that one takes bytes, React Native's own type does not.
  const WebBlob = Blob as unknown as new (
    parts: ArrayBufferView[],
    options?: { type: string },
  ) => Blob;

  return new WebBlob([document.bytes], { type: document.mimeType });
}

async function callApi<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new UploadError('offline', error);
    }
    if (error instanceof ApiError) {
      throw new UploadError(FAILURE_BY_CODE[error.code] ?? 'unexpected', error);
    }
    throw error;
  }
}
