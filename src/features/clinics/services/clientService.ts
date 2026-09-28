import { apiClient } from 'shared/services/apiClient';

import type {
  Client,
  CreateClientPayload,
  DeletedClient,
} from '../domain/client';

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
