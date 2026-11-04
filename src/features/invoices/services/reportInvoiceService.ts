import { apiClient } from 'shared/services/apiClient';

import {
  toReportInvoice,
  type BackendReportInvoice,
  type ReportInvoice,
} from '../domain/reportInvoice';

// O dono das notas vem do token: o backend lê o usuário do Authorization e
// recusa campos que não conhece (forbidNonWhitelisted), então nada aqui
// carrega userId. Só as notas confirmadas, da data de emissão mais recente
// para a mais antiga.
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
