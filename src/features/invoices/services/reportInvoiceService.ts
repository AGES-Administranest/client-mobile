import { apiClient } from 'shared/services/apiClient';

import {
  toReportInvoice,
  type BackendReportInvoice,
  type ReportInvoice,
} from '../domain/reportInvoice';

// The owner of the notes comes from the token: the backend reads the user from
// Authorization and refuses fields it does not know (forbidNonWhitelisted), so
// nothing here carries userId. Only confirmed notes, from the most recent issue
// date to the oldest.
export async function fetchReportInvoices(
  idToken: string,
  limit: number,
): Promise<ReportInvoice[]> {
  const query = new URLSearchParams({ page: '1', limit: String(limit) });
  const invoices = await apiClient.get<BackendReportInvoice[]>(
    `/service-invoices/reports?${query.toString()}`,
    { token: idToken },
  );

  return invoices.map(toReportInvoice);
}
