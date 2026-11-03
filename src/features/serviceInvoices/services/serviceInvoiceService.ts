import { apiClient } from 'shared/services/apiClient';

import {
  toServiceInvoice,
  type BackendServiceInvoice,
  type ServiceInvoice,
} from '../domain/serviceInvoice';

// O dono da nota vem do token: o backend lê o usuário do Authorization e
// recusa campos que não conhece (forbidNonWhitelisted), então nada aqui
// carrega userId.

// QueryServiceInvoiceDto limita `limit` a 100 (@Max(100)); pedir mais devolve
// 400 e derruba a listagem inteira.
export const MAX_PAGE_SIZE = 100;

// Sem `status` o backend devolve também os rascunhos ainda em revisão; só a
// nota confirmada está registrada.
export async function fetchServiceInvoices(
  idToken: string,
  limit: number,
): Promise<ServiceInvoice[]> {
  const query = new URLSearchParams({
    status: 'CONFIRMED',
    page: '1',
    limit: String(limit),
  });
  const invoices = await apiClient.get<BackendServiceInvoice[]>(
    `/service-invoices?${query.toString()}`,
    { token: idToken },
  );
  return invoices.map(toServiceInvoice);
}
