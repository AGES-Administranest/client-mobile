import { apiClient } from 'shared/services/apiClient';

import type { Client } from '../domain/client';

// O dono vem do token: o backend lê o usuário do Authorization e recusa
// `userId` no corpo ou na query (400).
//
// O tomador de um atendimento só pode ser uma clínica cadastrada na aba
// Clínicas (não há mais cadastro rápido aqui); `type=CLINIC` é o mesmo filtro
// que essa aba usa. Não há busca por nome no backend: a lista inteira vem de
// uma vez e o filtro pelo que foi digitado é local, ver filterClients e
// useClientSearch.
export async function fetchClients(idToken: string): Promise<Client[]> {
  return apiClient.get<Client[]>('/client?type=CLINIC', { token: idToken });
}
