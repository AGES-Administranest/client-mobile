import { apiClient } from 'shared/services/apiClient';

import type { Client, CreateClientPayload } from '../domain/client';

// O dono vem do token: o backend lê o usuário do Authorization e recusa
// `userId` no corpo ou na query (400).
//
// O GET /client só filtra por `type`; não existe busca por nome. Aqui vem a
// lista inteira do usuário (clínicas e pessoas físicas, que é o que o campo de
// tomador oferece) e o filtro pelo que foi digitado é local: ver
// filterClients e useClientSearch.
export async function fetchClients(idToken: string): Promise<Client[]> {
  return apiClient.get<Client[]>('/client', { token: idToken });
}

export async function createClient(
  idToken: string,
  payload: CreateClientPayload,
): Promise<Client> {
  return apiClient.post<Client>('/client', payload, { token: idToken });
}
