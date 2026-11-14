import { apiClient } from 'shared/services/apiClient';

import type {
  Client,
  CreateClientPayload,
  DeletedClient,
} from '../domain/client';
import {
  toClientAppointmentPage,
  toClientSummary,
  toHistoryQuery,
  toPeriodQuery,
  type ClientAppointmentListResponse,
  type ClientAppointmentPage,
  type ClientSummary,
  type ClientSummaryResponse,
  type HistoryPeriod,
} from '../domain/clientHistory';

export async function fetchClinics(idToken: string): Promise<Client[]> {
  return apiClient.get<Client[]>('/client?type=CLINIC', { token: idToken });
}

export async function createClient(
  idToken: string,
  payload: CreateClientPayload,
): Promise<Client> {
  return apiClient.post<Client>('/client', payload, { token: idToken });
}

export async function updateClient(
  idToken: string,
  id: string,
  payload: Partial<CreateClientPayload>,
): Promise<Client> {
  return apiClient.patch<Client>(`/client/${id}`, payload, { token: idToken });
}

export async function deleteClient(
  idToken: string,
  id: string,
): Promise<DeletedClient> {
  return apiClient.delete<DeletedClient>(`/client/${id}`, { token: idToken });
}

export async function fetchClientAppointments(
  idToken: string,
  clientId: string,
  period: HistoryPeriod,
  page: number,
): Promise<ClientAppointmentPage> {
  const response = await apiClient.get<ClientAppointmentListResponse>(
    `/client/${clientId}/appointments?${toHistoryQuery(period, page)}`,
    { token: idToken },
  );
  return toClientAppointmentPage(response);
}

export async function fetchClientSummary(
  idToken: string,
  clientId: string,
  period: HistoryPeriod,
): Promise<ClientSummary> {
  const response = await apiClient.get<ClientSummaryResponse>(
    `/client/${clientId}/summary?${toPeriodQuery(period)}`,
    { token: idToken },
  );
  return toClientSummary(response);
}
