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
