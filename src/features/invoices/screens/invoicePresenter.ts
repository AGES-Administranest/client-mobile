import type { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import type { Invoice } from '../domain/invoice.types';

type Translate = ReturnType<typeof useTranslation>['t'];

export type InvoiceCardView = {
  issuer: string;
  date: string;
  location: string;
};

export type InvoiceDetailRow = { label: string; value: string };

export function formatIssueDate(issuedAt: string, locale: string): string {
  return new Date(issuedAt).toLocaleDateString(locale);
}

export function invoiceCardView(
  invoice: Invoice,
  locale: string,
): InvoiceCardView {
  return {
    issuer: invoice.issuerName,
    date: formatIssueDate(invoice.issuedAt, locale),
    location: invoice.issuerCity,
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
