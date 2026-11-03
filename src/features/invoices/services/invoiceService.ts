import { STUB_INVOICES } from './invoiceStub';
import type { InvoicePage } from '../domain/invoice.types';
import {
  matchesFilters,
  type InvoiceFilters,
  type InvoiceQuery,
} from '../domain/invoiceFilters';
import { sortInvoicesByIssuedAt } from '../domain/sortInvoices';

export const INVOICES_PAGE_SIZE = 20;

function toFilters(query: InvoiceQuery): InvoiceFilters {
  return {
    search: query.search ?? '',
    range: { from: query.issuedFrom ?? null, to: query.issuedTo ?? null },
  };
}

// Stand-in for GET /invoices?page&limit&search&issuedFrom&issuedTo, keeping the
// signature the real call will have: the id token, the query and a 1-based page.
export function fetchInvoices(
  _idToken: string,
  query: InvoiceQuery = {},
  page = 1,
): Promise<InvoicePage> {
  const filters = toFilters(query);
  const matching = sortInvoicesByIssuedAt(
    STUB_INVOICES.filter(invoice => matchesFilters(invoice, filters)),
  );
  const start = (page - 1) * INVOICES_PAGE_SIZE;
  const end = start + INVOICES_PAGE_SIZE;

  return Promise.resolve({
    items: matching.slice(start, end),
    hasMore: matching.length > end,
  });
}

export const invoiceService = {
  fetchAll: fetchInvoices,
};
