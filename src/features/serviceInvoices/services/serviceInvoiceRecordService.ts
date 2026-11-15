import { ApiError, apiClient } from 'shared/services/apiClient';

import type {
  ServiceInvoiceCorrectionInput,
  ServiceInvoiceDownload,
  ServiceInvoicePage,
  ServiceInvoiceRecord,
  ServiceInvoiceSummary,
} from '../domain/serviceInvoiceRecord.types';

type SummaryResponse = {
  id: string;
  number: string | null;
  issueDate: string;
  amount: number;
  client: { id: string; name: string; taxId?: string | null };
  location: string | null;
  hasFile: boolean;
};

type ListResponse = { items: SummaryResponse[]; total: number };

type RecordResponse = SummaryResponse & {
  file: { name: string; bytesSize: number } | null;
};

type DetailResponse = { invoice?: RecordResponse };

export type ListInvoicesParams = {
  page: number;
  pageSize: number;
  search?: string;
};

function toSummary(response: SummaryResponse): ServiceInvoiceSummary {
  return {
    id: response.id,
    number: response.number,
    issueDate: response.issueDate,
    amount: response.amount,
    clientId: response.client.id,
    clientName: response.client.name,
    location: response.location,
    hasFile: response.hasFile,
    syncStatus: 'SYNCED',
  };
}

function toRecord(response: RecordResponse): ServiceInvoiceRecord {
  return {
    ...toSummary(response),
    clientTaxId: response.client.taxId ?? null,
    file: response.file,
  };
}

export async function fetchServiceInvoices(
  idToken: string,
  { page, pageSize, search }: ListInvoicesParams,
): Promise<ServiceInvoicePage> {
  const query = new URLSearchParams({
    status: 'CONFIRMED',
    sort: 'issueDate:desc',
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) query.set('search', search);

  const response = await apiClient.get<ListResponse>(
    `/service-invoices?${query.toString()}`,
    { token: idToken },
  );
  return { items: response.items.map(toSummary), total: response.total };
}

export async function fetchServiceInvoiceRecord(
  idToken: string,
  invoiceId: string,
): Promise<ServiceInvoiceRecord> {
  const response = await apiClient.get<DetailResponse>(
    `/service-invoices/${invoiceId}`,
    { token: idToken },
  );
  if (!response.invoice) {
    throw new ApiError('Service invoice not confirmed', null, 404);
  }
  return toRecord(response.invoice);
}

export async function requestServiceInvoiceDownload(
  idToken: string,
  invoiceId: string,
): Promise<ServiceInvoiceDownload> {
  return apiClient.get<ServiceInvoiceDownload>(
    `/service-invoices/${invoiceId}/download-url`,
    { token: idToken },
  );
}

export async function correctServiceInvoice(
  idToken: string,
  invoiceId: string,
  input: ServiceInvoiceCorrectionInput,
): Promise<ServiceInvoiceRecord> {
  const response = await apiClient.patch<DetailResponse>(
    `/service-invoices/${invoiceId}`,
    input,
    { token: idToken },
  );
  if (!response.invoice) {
    throw new ApiError('Service invoice not confirmed', null, 404);
  }
  return toRecord(response.invoice);
}

export async function deleteConfirmedServiceInvoice(
  idToken: string,
  invoiceId: string,
): Promise<void> {
  await apiClient.delete<void>(`/service-invoices/${invoiceId}`, {
    token: idToken,
  });
}
