import type { ServiceInvoiceFormValues } from './serviceInvoice.types';

export type InvoiceSyncStatus = 'SYNCED' | 'PENDING' | 'ERROR';

export type InvoiceStatusFilter = 'ALL' | InvoiceSyncStatus;

export type ServiceInvoiceSummary = {
  id: string;
  number: string | null;
  issueDate: string;
  amount: number;
  clientId: string;
  clientName: string;
  location: string | null;
  hasFile: boolean;
  syncStatus: InvoiceSyncStatus;
};

export type ServiceInvoiceFileInfo = { name: string; bytesSize: number };

export type ServiceInvoiceRecord = ServiceInvoiceSummary & {
  clientTaxId: string | null;
  file: ServiceInvoiceFileInfo | null;
};

export type ServiceInvoiceCorrectionValues = ServiceInvoiceFormValues & {
  location: string;
};

export type ServiceInvoiceCorrectionInput = {
  issueDate: string;
  amount: number;
  clientId: string;
  location: string | null;
};

export type ServiceInvoiceDownload = { url: string; filename: string };

export type ServiceInvoicePage = {
  items: ServiceInvoiceSummary[];
  total: number;
};
