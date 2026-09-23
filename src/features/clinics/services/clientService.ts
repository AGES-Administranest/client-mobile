import type { Client, CreateClientPayload } from '../domain/client';

// Stand-in até existir o POST /client (subtask "Endpoints CRUD de tomadores
// de serviço" da US16): hoje o ClientController do backend não tem rotas. A
// assinatura já é a da chamada real, então a troca é só o corpo, como no
// itemService:
//   return apiClient.post<Client>('/client', payload, { token: idToken });
// O dono vem do token: o backend recusa userId no corpo com 400.
export async function createClient(
  idToken: string,
  payload: CreateClientPayload,
): Promise<Client> {
  const now = new Date().toISOString();

  return Promise.resolve({
    id: `local-${Date.now()}`,
    type: payload.type,
    name: payload.name,
    taxId: payload.taxId ?? null,
    taxIdType: payload.taxIdType ?? null,
    contactName: payload.contactName ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    addressLine: payload.addressLine ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    serviceDays: [],
    paymentTermsDays: null,
    preferredPaymentMethod: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}
