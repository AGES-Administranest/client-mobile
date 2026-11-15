import type { TranslationKey } from 'shared/i18n';

import type { InvoiceSyncStatus } from '../domain/serviceInvoiceRecord.types';

export const STATUS_LABEL_KEYS: Record<InvoiceSyncStatus, TranslationKey> = {
  SYNCED: 'serviceInvoices.records.status.SYNCED',
  PENDING: 'serviceInvoices.records.status.PENDING',
  ERROR: 'serviceInvoices.records.status.ERROR',
};
