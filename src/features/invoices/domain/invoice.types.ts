export type InvoiceKind = 'PURCHASE' | 'SERVICE';

export type InvoiceSyncStatus = 'SYNCED' | 'NOT_SYNCED' | 'ERROR';

export type Invoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  issuerName: string;
  takerName: string;
  takerCnpj: string;
  amount: number;
  issuedAt: string;
  syncStatus: InvoiceSyncStatus;
};

export type InvoicePage = {
  items: Invoice[];
  hasMore: boolean;
};
