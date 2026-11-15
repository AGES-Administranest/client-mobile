import { normalizeForSearch } from 'shared/utils/search';

import { isoToDateInput } from './extractionToFormValues';
import type {
  InvoiceStatusFilter,
  ServiceInvoiceSummary,
} from './serviceInvoiceRecord.types';

const MIN_DATE_DIGITS = 2;

export function sortByIssueDateDesc<T extends ServiceInvoiceSummary>(
  invoices: T[],
): T[] {
  return [...invoices].sort(
    (a, b) =>
      b.issueDate.localeCompare(a.issueDate) || a.id.localeCompare(b.id),
  );
}

function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

export function matchesSearchTerm(
  invoice: ServiceInvoiceSummary,
  term: string,
): boolean {
  const normalized = normalizeForSearch(term);
  if (normalized === '') return true;

  if (normalizeForSearch(invoice.clientName).includes(normalized)) return true;
  if (
    invoice.number &&
    normalizeForSearch(invoice.number).includes(normalized)
  ) {
    return true;
  }

  const digits = digitsOf(term);
  return (
    digits.length >= MIN_DATE_DIGITS &&
    digitsOf(isoToDateInput(invoice.issueDate)).includes(digits)
  );
}

type InvoiceFilter = { term: string; status: InvoiceStatusFilter };

export function filterInvoices(
  invoices: ServiceInvoiceSummary[],
  { term, status }: InvoiceFilter,
): ServiceInvoiceSummary[] {
  return invoices.filter(
    invoice =>
      (status === 'ALL' || invoice.syncStatus === status) &&
      matchesSearchTerm(invoice, term),
  );
}

export function formatInvoiceDate(iso: string): string {
  return isoToDateInput(iso) || iso;
}

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

export function formatFileSize(bytes: number, locale: string): string {
  if (bytes >= MEGABYTE) {
    const megabytes = (bytes / MEGABYTE).toLocaleString(locale, {
      maximumFractionDigits: 1,
    });
    return `${megabytes} MB`;
  }
  return `${Math.max(1, Math.round(bytes / KILOBYTE))} KB`;
}

const CACHE_LIMIT = 50;

export function mergeInvoiceCache(
  cached: ServiceInvoiceSummary[],
  firstPage: ServiceInvoiceSummary[],
  total: number,
): ServiceInvoiceSummary[] {
  if (total <= firstPage.length) return firstPage;
  const inPage = new Set(firstPage.map(invoice => invoice.id));
  const oldest = firstPage[firstPage.length - 1]?.issueDate;
  const older = cached.filter(
    invoice =>
      !inPage.has(invoice.id) && (!oldest || invoice.issueDate < oldest),
  );
  return [...firstPage, ...older].slice(0, CACHE_LIMIT);
}
