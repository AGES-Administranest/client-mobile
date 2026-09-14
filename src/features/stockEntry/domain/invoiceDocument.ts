/**
 * The document behind a stock entry, from the moment it is picked to the moment
 * it lands in the bucket.
 */

/** What the backend's presigned policy accepts — nothing else can be sent. */
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg'] as const;

export type InvoiceMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Mirrors the backend's ceiling: over this it answers 413 before signing. */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

/** What the picker (or the camera) handed us, before we describe it. */
export type PickedFile = {
  /**
   * The file on disk. Native always has one and uploads straight from it, so
   * the bytes never go through the request body twice. On web the picker gives
   * a File object instead and this is `null`.
   */
  uri: string | null;
  bytes: Uint8Array;
  name: string;
  mimeType: InvoiceMimeType;
};

/**
 * A picked file plus everything the API needs to sign an upload for it: the id
 * the invoice will have, its size and its hash.
 */
export type InvoiceDocument = PickedFile & {
  /** Generated on the client (ADR-09): the invoice is created with this id. */
  id: string;
  sizeBytes: number;
  /** Lowercase hex SHA-256 — the shape the backend validates. */
  hash: string;
};

export function isAllowedMimeType(value: string): value is InvoiceMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * The type of a picked image. `mimeType` comes from the picker when it knows
 * it; a photo taken by the camera arrives with nothing but its file name, and
 * `.jpg`/`.jpeg` is what the camera writes.
 */
export function imageMimeType(
  name: string,
  declared?: string | null,
): InvoiceMimeType | null {
  if (declared && isAllowedMimeType(declared)) {
    return declared;
  }
  // A HEIC from the photo library, a PNG screenshot: real files the policy
  // would refuse, so we stop here instead of at a 400 from the API.
  if (declared) {
    return null;
  }

  return /\.jpe?g$/i.test(name) ? 'image/jpeg' : null;
}
