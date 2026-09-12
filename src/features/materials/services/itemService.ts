import { apiClient } from 'shared/services/apiClient';
import { sessionStore } from 'shared/services/sessionStore';

import type {
  BackendItem,
  BackendItemCategory,
  BackendMeasurementUnit,
} from '../domain/materialsFilter';

// userId sai da sessão dentro do service: quem chama não tem como errá-lo.
export type CreateItemPayload = {
  category: BackendItemCategory;
  unit: BackendMeasurementUnit;
  name: string;
  defaultUnitCost?: number;
  minimumStock?: number;
  supplierId?: string;
};

export type UpdateItemPayload = Partial<CreateItemPayload>;

export type DeletedItem = {
  id: string;
  name: string;
};

// QueryItemDto limita `limit` a 100 (@Max(100)); pedir mais devolve 400 e
// derruba a listagem inteira.
const MAX_PAGE_SIZE = 100;

// Toda rota de item exige um userId UUID. Sem sessão a chamada só pode
// falhar no servidor, então falhamos aqui — com um erro que diz o porquê.
function requireSession() {
  const session = sessionStore.get();
  if (!session?.userId) {
    throw new Error(
      'No active session: sign in first, or set EXPO_PUBLIC_DEV_USER_ID and EXPO_PUBLIC_DEV_ID_TOKEN.',
    );
  }
  return session;
}

function authOptions(token: string) {
  return { token };
}

export async function fetchItems(): Promise<BackendItem[]> {
  const session = requireSession();
  const query = new URLSearchParams({
    userId: session.userId,
    active: 'true',
    sort: 'name',
    page: '1',
    limit: String(MAX_PAGE_SIZE),
  });
  return apiClient.get<BackendItem[]>(
    `/item?${query.toString()}`,
    authOptions(session.idToken),
  );
}

export async function createItem(
  payload: CreateItemPayload,
): Promise<BackendItem> {
  const session = requireSession();
  return apiClient.post<BackendItem>(
    '/item',
    { ...payload, userId: session.userId },
    authOptions(session.idToken),
  );
}

export async function updateItem(
  id: string,
  payload: UpdateItemPayload,
): Promise<BackendItem> {
  const session = requireSession();
  return apiClient.patch<BackendItem>(
    `/item/${id}`,
    payload,
    authOptions(session.idToken),
  );
}

export async function deleteItem(id: string): Promise<DeletedItem> {
  const session = requireSession();
  return apiClient.delete<DeletedItem>(
    `/item/${id}`,
    authOptions(session.idToken),
  );
}
