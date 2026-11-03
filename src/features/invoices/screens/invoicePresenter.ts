import type { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import type { InvoiceStatusTone } from '../components/InvoiceCard';
import type { Invoice, InvoiceSyncStatus } from '../domain/invoice.types';

type Translate = ReturnType<typeof useTranslation>['t'];

export type InvoiceCardView = {
  title: string;
  date: string;
  issuer: string;
  taker: string;
  value: string;
  statusLabel: string;
  statusTone: InvoiceStatusTone;
};

export type InvoiceDetailRow = { label: string; value: string };

const STATUS_TONE: Record<InvoiceSyncStatus, InvoiceStatusTone> = {
  SYNCED: 'success',
  NOT_SYNCED: 'attention',
  ERROR: 'alert',
};

export function formatIssueDate(issuedAt: string, locale: string): string {
  return new Date(issuedAt).toLocaleDateString(locale);
}

export function invoiceCardView(
  invoice: Invoice,
  t: Translate,
  locale: string,
): InvoiceCardView {
  return {
    title: t('invoices.card.title', { number: invoice.number }),
    date: formatIssueDate(invoice.issuedAt, locale),
    issuer: t('invoices.card.issuer', { name: invoice.issuerName }),
    taker: t('invoices.card.taker', { name: invoice.takerName }),
    value: formatCurrency(invoice.amount, locale),
    statusLabel: t(`invoices.status.${invoice.syncStatus}`),
    statusTone: STATUS_TONE[invoice.syncStatus],
  };
}

export function invoiceDetailRows(
  invoice: Invoice,
  t: Translate,
  locale: string,
): InvoiceDetailRow[] {
  return [
    {
      label: t('invoices.detail.kind'),
      value: t(`invoices.kind.${invoice.kind}`),
    },
    { label: t('invoices.detail.issuer'), value: invoice.issuerName },
    { label: t('invoices.detail.taker'), value: invoice.takerName },
    { label: t('invoices.detail.takerCnpj'), value: invoice.takerCnpj },
    {
      label: t('invoices.detail.value'),
      value: formatCurrency(invoice.amount, locale),
    },
    {
      label: t('invoices.detail.issuedAt'),
      value: formatIssueDate(invoice.issuedAt, locale),
    },
    {
      label: t('invoices.detail.status'),
      value: t(`invoices.status.${invoice.syncStatus}`),
    },
  ];
}
