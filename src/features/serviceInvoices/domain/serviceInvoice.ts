/** What `GET /service-invoices` documents for each note. */
export type BackendServiceInvoice = {
  id: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  fileName?: string;
  number?: string;
  /** `YYYY-MM-DD`. */
  issueDate?: string;
  /** The taker as printed on the note. */
  takerName?: string;
  clientId?: string;
  /** Absent while the upload never arrived. */
  uploadedAt?: string;
  createdAt: string;
};

export type ServiceInvoice = {
  id: string;
  /** `YYYY-MM-DD`, null while the note has no issue date. */
  issueDate: string | null;
  takerName: string | null;
  hasOriginalFile: boolean;
};

/** How many notes the Reports tab shows before "Ver todos". */
export const RECENT_INVOICES_LIMIT = 5;

export function toServiceInvoice(
  invoice: BackendServiceInvoice,
): ServiceInvoice {
  return {
    id: invoice.id,
    issueDate: invoice.issueDate ?? null,
    takerName: invoice.takerName ?? null,
    hasOriginalFile: invoice.uploadedAt !== undefined,
  };
}

/** `YYYY-MM-DD` as the date fields show it, `dd/mm/aaaa`. */
export function formatIssueDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
