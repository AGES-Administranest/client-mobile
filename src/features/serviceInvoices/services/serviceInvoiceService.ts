import {
  sortByIssueDateDesc,
  type ServiceInvoice,
} from '../domain/serviceInvoice';

// Stand-in until `GET /service-invoices` exists on the backend. The real call
// is `apiClient.get<ServiceInvoice[]>('/service-invoices?limit=...', { token })`
// and the API already answers newest first; the sort here only keeps the
// stand-in honest about that contract. The token is the owner, as in every
// service, and no userId is ever sent.
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
  return Promise.resolve(
    sortByIssueDateDesc(STAND_IN_INVOICES).slice(0, limit),
  );
}
