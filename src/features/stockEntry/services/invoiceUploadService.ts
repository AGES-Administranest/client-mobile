import { ApiError, NetworkError, postJson } from 'shared/api';
import {
  postToPresignedForm,
  type PresignedPost,
} from 'shared/services/presignedUpload';

import type { Extraction } from '../domain/extraction';
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

  /** On a duplicated file, the entry that already holds it. */
  get existingEntryId(): string | null {
    const id =
      this.cause instanceof ApiError
        ? this.cause.details?.purchaseInvoiceId
        : undefined;
    return typeof id === 'string' ? id : null;
  }
}

type UploadTarget = PresignedPost & { expiresAt: number };

type UploadConfirmation = {
  contentLength: number;
  contentType: string;
  extraction: Extraction;
};

/** The backend's error codes are the contract (ADR-07), not its messages. */
const FAILURE_BY_CODE: Record<string, UploadFailure> = {
  INVOICE_FILE_TOO_LARGE: 'tooLarge',
  INVOICE_FILE_DUPLICATED: 'duplicateFile',
  USER_NOT_PROVISIONED: 'notProvisioned',
  INVOICE_UPLOAD_NOT_FINISHED: 'notConfirmed',
  INVOICE_UPLOAD_MISMATCH: 'notConfirmed',
};

export async function uploadInvoiceDocument(
  document: InvoiceDocument,
  idToken: string,
): Promise<Extraction> {
  // The API refuses this with a 413 anyway; refusing here saves the round trip
  // and, more to the point, the wait before the user is told.
  if (document.sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new UploadError('tooLarge');
  }

  await sendToBucket(document, idToken);
  const { extraction } = await confirmUpload(document, idToken);
  return extraction;
}

async function sendToBucket(
  document: InvoiceDocument,
  idToken: string,
): Promise<void> {
  const target = await requestUploadTarget(document, idToken);

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
  await postToBucket(await requestUploadTarget(document, idToken), document);
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

function requestUploadTarget(
  document: InvoiceDocument,
  idToken: string,
): Promise<UploadTarget> {
  return callApi(() =>
    postJson<UploadTarget>(
      `/stock-entries/${document.id}/upload-url`,
      idToken,
      {
        filename: document.name,
        fileMimeType: document.mimeType,
        fileHash: document.hash,
        fileBytesSize: document.sizeBytes,
      },
    ),
  );
}

/**
 * The API checks the bucket here; until it answers, nothing is uploaded. It
 * also reads the PDF before answering (US10 §0.3).
 */
function confirmUpload(
  document: InvoiceDocument,
  idToken: string,
): Promise<UploadConfirmation> {
  return callApi(() =>
    postJson<UploadConfirmation>(
      `/stock-entries/${document.id}/uploaded`,
      idToken,
    ),
  );
}

async function postToBucket(
  target: UploadTarget,
  document: InvoiceDocument,
): Promise<void> {
  let response: Response;
  try {
    response = await postToPresignedForm(target, document);
  } catch (cause) {
    throw new UploadError('offline', cause);
  }

  if (!response.ok) {
    throw new UploadError('uploadRejected', undefined, response.status);
  }
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
