import { formatShortCalendarDate } from 'shared/utils/calendar';

/** What `GET /service-invoices/reports` documents for each confirmed note. */
export type BackendReportInvoice = {
  id: string;
  /** `YYYY-MM-DD`. */
  issueDate: string;
  /** The name of the client confirmed as the note's taker. */
  takerName: string;
  hasFile: boolean;
};

export type ReportInvoice = {
  id: string;
  issueDate: string;
  takerName: string;
  hasOriginalFile: boolean;
};

export function toReportInvoice(invoice: BackendReportInvoice): ReportInvoice {
  return {
    id: invoice.id,
    issueDate: invoice.issueDate,
    takerName: invoice.takerName,
    hasOriginalFile: invoice.hasFile,
  };
}

/**
 * The `YYYY-MM-DD` part of an issue date as a short date in the locale, read
 * from the text. Going through `Date` would take the day as UTC midnight and
 * show the day before in Brazil.
 */
export function formatReportDate(isoDate: string, locale: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(isoDate);

  return match ? formatShortCalendarDate(match[1], locale) : '';
}
