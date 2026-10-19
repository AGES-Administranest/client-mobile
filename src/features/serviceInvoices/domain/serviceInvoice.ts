/**
 * An invoice the professional issued outside the app, as the lists show it.
 * Mirrors what `GET /service-invoices` documents: the borrower is the client's
 * name, and the original file is available when the invoice has a stored file.
 */
export type ServiceInvoice = {
  id: string;
  /** `YYYY-MM-DD`, null while the issue date was not read from the document. */
  issueDate: string | null;
  /** The borrower: the name of the invoice's client, null when it has none. */
  clientName: string | null;
  hasOriginalFile: boolean;
};

/** How many invoices the Reports tab shows before "Ver todos". */
export const RECENT_INVOICES_LIMIT = 5;

/** `YYYY-MM-DD` as the date fields show it, `dd/mm/aaaa`. */
export function formatIssueDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Newest issue date first; an invoice without a date goes last. */
export function sortByIssueDateDesc(
  invoices: readonly ServiceInvoice[],
): ServiceInvoice[] {
  return [...invoices].sort((a, b) => {
    if (a.issueDate === b.issueDate) return 0;
    if (a.issueDate === null) return 1;
    if (b.issueDate === null) return -1;
    return b.issueDate.localeCompare(a.issueDate);
  });
}
