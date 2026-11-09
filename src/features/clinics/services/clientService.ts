import { apiClient } from 'shared/services/apiClient';

import { stubAppointmentsPage, stubSummary } from './clientHistoryStub';
import type {
  Client,
  CreateClientPayload,
  DeletedClient,
} from '../domain/client';
import {
  toClientAppointment,
  toClientSummary,
  type ClientAppointment,
  type ClientSummary,
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

// Stand-ins de GET /client/:id/appointments?from&to&page&limit e de
// GET /client/:id/summary?from&to (US17), com a assinatura da chamada real.
// Na integração, só a origem dos dados muda: o resto já passa pela conversão
// da resposta da API.
export async function fetchClientAppointments(
  _idToken: string,
  _clientId: string,
  period: HistoryPeriod,
  page: number,
): Promise<ClientAppointment[]> {
  const appointments = await stubAppointmentsPage(period, page);
  return appointments.map(toClientAppointment);
}

export async function fetchClientSummary(
  _idToken: string,
  _clientId: string,
  period: HistoryPeriod,
): Promise<ClientSummary> {
  return toClientSummary(await stubSummary(period));
}
