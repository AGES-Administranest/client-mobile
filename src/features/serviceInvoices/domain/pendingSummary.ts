import type { PendingServiceInvoice } from './offlineServiceInvoices';
import type {
  ServiceInvoiceRecord,
  ServiceInvoiceSummary,
} from './serviceInvoiceRecord.types';

export function pendingToSummary(
  invoice: PendingServiceInvoice,
  clientName: string,
): ServiceInvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    issueDate: invoice.issueDate,
    amount: invoice.amount,
    clientId: invoice.clientId,
    clientName,
    location: null,
    hasFile: true,
    syncStatus: invoice.rejection ? 'ERROR' : 'PENDING',
  };
}

export function pendingToRecord(
  invoice: PendingServiceInvoice,
  clientName: string,
): ServiceInvoiceRecord {
  return {
    ...pendingToSummary(invoice, clientName),
    clientTaxId: null,
    file: { name: invoice.file.name, bytesSize: invoice.file.bytesSize },
  };
}

type ListSources = {
  server: ServiceInvoiceSummary[];
  pending: PendingServiceInvoice[];
  deletedIds: string[];
  clientNames: Record<string, string>;
};

export function mergeInvoiceSources({
  server,
  pending,
  deletedIds,
  clientNames,
}: ListSources): ServiceInvoiceSummary[] {
  const deleted = new Set(deletedIds);
  const known = new Set(server.map(invoice => invoice.id));
  return [
    ...pending
      .filter(invoice => !known.has(invoice.id))
      .map(invoice =>
        pendingToSummary(invoice, clientNames[invoice.clientId] ?? ''),
      ),
    ...server.filter(invoice => !deleted.has(invoice.id)),
  ];
}
