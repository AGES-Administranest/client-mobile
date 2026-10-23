// Provisional: the NFSe endpoints are not in the backend yet. The extraction
// mirrors what the backend's NFSe reader returns (feat/us01-nfse-extraction).
export type ServiceInvoiceExtraction = {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  /** `YYYY-MM-DD` */
  issueDate?: string;
  amount?: number;
  number?: string;
  taker?: { name?: string; taxId?: string };
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
  issueDate?: 'required' | 'invalid' | 'future';
  amount?: 'required' | 'invalid' | 'mustBePositive';
  clientId?: 'required';
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
