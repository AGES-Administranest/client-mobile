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

/** What a reading of the PDF found, which the typed data never yields to. */
export type ServiceInvoiceReading = {
  issueDate?: string;
  amount?: number;
  number?: string;
};

export type ServiceInvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
