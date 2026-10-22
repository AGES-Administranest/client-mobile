import type { ServiceInvoice } from '../domain/serviceInvoice';

// Stand-in until `GET /service-invoices` exists on the backend. The real call
// is `apiClient.get<ServiceInvoice[]>('/service-invoices?limit=...', { token })`
// and the API answers newest issue date first, so this list is already in that
// order. The token is the owner, as in every service: no userId is ever sent.
const STAND_IN_INVOICES: ServiceInvoice[] = [
  {
    id: 'invoice-1',
    issueDate: '2026-04-22',
    clientName: 'HospVet Sul',
    hasOriginalFile: true,
  },
  {
    id: 'invoice-2',
    issueDate: '2026-04-15',
    clientName: 'Clínica Vida Animal',
    hasOriginalFile: true,
  },
  {
    id: 'invoice-3',
    issueDate: '2026-03-30',
    clientName: 'HospVet Norte',
    hasOriginalFile: false,
  },
];

export function fetchRecentServiceInvoices(
  idToken: string,
  limit: number,
): Promise<ServiceInvoice[]> {
  return Promise.resolve(STAND_IN_INVOICES.slice(0, limit));
}
