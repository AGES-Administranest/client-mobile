export type FileCandidate = {
  name: string;
  mimeType?: string | null;
};

const PDF_MIME_TYPE = 'application/pdf';

/** Only PDFs: the extension has to say so and a declared type cannot disagree. */
export function isAcceptedServiceInvoiceFile({
  name,
  mimeType,
}: FileCandidate): boolean {
  if (!/\.pdf$/i.test(name.trim())) {
    return false;
  }
  const declared = mimeType?.trim().toLowerCase();
  return !declared || declared === PDF_MIME_TYPE;
}

/** The backend's ceiling (SERVICE_INVOICE_UPLOAD): over it, the upload is refused. */
export const MAX_SERVICE_INVOICE_FILE_BYTES = 15 * 1024 * 1024;

export function isWithinServiceInvoiceSizeLimit(bytesSize: number): boolean {
  return bytesSize <= MAX_SERVICE_INVOICE_FILE_BYTES;
}

/** Why a file the person picked will not be read. */
export type FileRefusal = 'notPdf' | 'tooLarge' | 'alreadySent';

const REFUSAL_BY_CODE = new Map<string, FileRefusal>([
  ['SERVICE_INVOICE_FILE_TOO_LARGE', 'tooLarge'],
  ['SERVICE_INVOICE_FILE_DUPLICATED', 'alreadySent'],
]);

/** The backend's refusals of the file itself; any other error is not about the file. */
export function fileRefusalOf(code: string | null): FileRefusal | null {
  return code === null ? null : REFUSAL_BY_CODE.get(code) ?? null;
}
