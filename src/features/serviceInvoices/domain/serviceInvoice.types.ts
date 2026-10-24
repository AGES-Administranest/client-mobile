// Provisional: the NFSe endpoints are not in the backend yet. The extraction
// mirrors what the backend's NFSe reader returns (feat/us01-nfse-extraction).
export type ExtractedClient = { id: string; name: string; taxId: string };

export type ServiceInvoiceExtraction = {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  /** `YYYY-MM-DD` */
  issueDate?: string;
  amount?: number;
  number?: string;
  taker?: { name?: string; taxId?: string };
  clientMatch?: ExtractedClient;
  clientSuggestions?: ExtractedClient[];
};

export type ServiceInvoiceFormValues = {
  /** `DD/MM/AAAA`, as typed. */
  issueDate: string;
  /** Masked BRL, as typed ("1.234,56"). */
  amount: string;
  number: string;
  clientId: string | null;
};

export type ServiceInvoiceField = 'issueDate' | 'amount' | 'clientId';

export type ServiceInvoiceErrors = {
  issueDate?: 'required' | 'invalid';
  amount?: 'required' | 'invalid' | 'mustBePositive';
  clientId?: 'required' | 'pending';
};

/** What the confirmation sends: dates as `YYYY-MM-DD`, the amount as a number. */
export type ServiceInvoiceInput = {
  issueDate: string;
  amount: number;
  number?: string;
  clientId: string;
};

export const EMPTY_SERVICE_INVOICE_FORM: ServiceInvoiceFormValues = {
  issueDate: '',
  amount: '',
  number: '',
  clientId: null,
};

export type ServiceInvoiceDuplicate = {
  id: string;
  number?: string;
  /** `YYYY-MM-DD` */
  issueDate: string;
  amount: number;
  clientName: string;
};

/** A duplicate comes back instead of the new note until the person insists. */
export type ServiceInvoiceConfirmation =
  | { id: string }
  | { duplicateOf: ServiceInvoiceDuplicate };

export type ConfirmServiceInvoiceOptions = { allowDuplicate?: boolean };

// Provisional, like the rest of this file: there is no /service-invoices/sync
// in the backend yet. The batch follows /financial-entries/sync (a result per
// item) and the id is the app's (ADR-09), which is what makes a resend safe.
export type ServiceInvoiceSyncItem = {
  id: string;
  /** `YYYY-MM-DD` */
  issueDate: string;
  amount: number;
  number?: string;
  clientId: string;
  fileName: string;
  fileHash: string;
  fileBytesSize: number;
};

/** What a reading of the PDF found, which the typed data never yields to. */
export type ServiceInvoiceReading = {
  issueDate?: string;
  amount?: number;
  number?: string;
};

export type ServiceInvoiceSyncResult = {
  id: string;
  status: 'applied' | 'ignored' | 'conflict';
  financialEntryId?: string;
  code?: string;
  reading?: ServiceInvoiceReading;
};

/** The body of `POST /service-invoices/:id/upload-url` (backend #71). */
export type ServiceInvoiceUploadRequest = {
  filename: string;
  fileMimeType: string;
  fileHash: string;
  fileBytesSize: number;
};

/** The presigned POST that comes back: send `fields`, then the file. */
export type ServiceInvoiceUploadTarget = {
  url: string;
  fields: Record<string, string>;
  expiresAt: number;
};
