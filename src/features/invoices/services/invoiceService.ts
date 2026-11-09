import type { InvoicePage } from '../domain/invoice.types';
import type { InvoiceQuery } from '../domain/invoiceFilters';

export const INVOICES_PAGE_SIZE = 20;

// Stand-in until the invoices endpoint exists: no invoice at all, never made-up
// ones. Keeps the signature the real call will have, GET /invoices?page&limit&
// search&issuedFrom&issuedTo: the id token, the query and a 1-based page.
export function fetchInvoices(
  _idToken: string,
  _query: InvoiceQuery = {},
  _page = 1,
): Promise<InvoicePage> {
  return Promise.resolve({ items: [], hasMore: false, total: 0 });
}

export const invoiceService = {
  fetchAll: fetchInvoices,
};
