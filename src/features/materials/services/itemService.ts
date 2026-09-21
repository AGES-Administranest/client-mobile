import { apiClient } from 'shared/services/apiClient';
<<<<<<< HEAD
import { sessionStore } from 'shared/services/sessionStore';
=======
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a

import type {
  BackendItem,
  BackendItemCategory,
  BackendMeasurementUnit,
} from '../domain/materialsFilter';

<<<<<<< HEAD
export type CreateItemPayload = {
  userId: string;
=======
// O dono do item vem do token: o backend lê o usuário do Authorization e
// recusa `userId` no corpo ou na query (400, forbidNonWhitelisted). Por isso
// nenhum payload daqui carrega userId — só o idToken, que quem chama recebe de
// useAuth().
export type CreateItemPayload = {
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
  category: BackendItemCategory;
  unit: BackendMeasurementUnit;
  name: string;
  defaultUnitCost?: number;
  minimumStock?: number;
  supplierId?: string;
};

<<<<<<< HEAD
export type UpdateItemPayload = Partial<Omit<CreateItemPayload, 'userId'>>;
=======
export type UpdateItemPayload = Partial<CreateItemPayload>;
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a

export type DeletedItem = {
  id: string;
  name: string;
};

<<<<<<< HEAD
function authOptions() {
  const session = sessionStore.get();
  return session ? { token: session.idToken } : undefined;
}

export async function fetchItems(): Promise<BackendItem[]> {
  const session = sessionStore.get();
  const userId = session?.userId ?? '';
  const query = new URLSearchParams({
    userId,
    active: 'true',
    sort: 'name',
    page: '1',
    limit: '200',
  });
  return apiClient.get<BackendItem[]>(`/item?${query.toString()}`, authOptions());
}

export async function createItem(
  payload: CreateItemPayload,
): Promise<BackendItem> {
  return apiClient.post<BackendItem>('/item', payload, authOptions());
}

export async function updateItem(
  id: string,
  payload: UpdateItemPayload,
): Promise<BackendItem> {
  return apiClient.patch<BackendItem>(`/item/${id}`, payload, authOptions());
}

export async function deleteItem(id: string): Promise<DeletedItem> {
  return apiClient.delete<DeletedItem>(`/item/${id}`, authOptions());
=======
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
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
}
