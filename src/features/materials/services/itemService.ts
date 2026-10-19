import { apiClient } from 'shared/services/apiClient';

import type {
  BackendItem,
  BackendItemCategory,
  BackendMeasurementUnit,
} from '../domain/materialsFilter';

// O dono do item vem do token: o backend lê o usuário do Authorization e
// recusa `userId` no corpo ou na query (400, forbidNonWhitelisted). Por isso
// nenhum payload daqui carrega userId — só o idToken, que quem chama recebe de
// useAuth().
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

export async function fetchItems(idToken: string): Promise<BackendItem[]> {
  const query = new URLSearchParams({
    active: 'true',
    sort: 'name',
    page: '1',
    limit: String(MAX_PAGE_SIZE),
  });
  return apiClient.get<BackendItem[]>(`/item?${query.toString()}`, {
    token: idToken,
  });
}

// `search` casa parte do nome, sem diferenciar maiúsculas. O backend ignora o
// termo com menos de 2 caracteres e devolve o catálogo inteiro — quem chama
// decide se vale perguntar (ver isSearchable em features/stock).
export async function searchItems(
  idToken: string,
  term: string,
): Promise<BackendItem[]> {
  const query = new URLSearchParams({
    search: term.trim(),
    active: 'true',
    sort: 'name',
    page: '1',
    limit: String(MAX_PAGE_SIZE),
  });
  return apiClient.get<BackendItem[]>(`/item?${query.toString()}`, {
    token: idToken,
  });
}

export async function createItem(
  idToken: string,
  payload: CreateItemPayload,
): Promise<BackendItem> {
  return apiClient.post<BackendItem>('/item', payload, { token: idToken });
}

// Item de outra conta responde 404: o backend não confirma que ele existe.
export async function updateItem(
  idToken: string,
  id: string,
  payload: UpdateItemPayload,
): Promise<BackendItem> {
  return apiClient.patch<BackendItem>(`/item/${id}`, payload, {
    token: idToken,
  });
}

export async function deleteItem(
  idToken: string,
  id: string,
): Promise<DeletedItem> {
  return apiClient.delete<DeletedItem>(`/item/${id}`, { token: idToken });
}
