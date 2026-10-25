import type { Invoice } from './invoice.types';

export function sortInvoicesByIssuedAt(
  invoices: readonly Invoice[],
): Invoice[] {
  return [...invoices].sort((a, b) => {
    const difference =
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();

    return difference !== 0 ? difference : b.number.localeCompare(a.number);
  });
}
