import { apiClient } from 'shared/services/apiClient';
import { sessionStore } from 'shared/services/sessionStore';

import type {
  BackendItem,
  BackendItemCategory,
  BackendMeasurementUnit,
} from '../domain/materialsFilter';

export type CreateItemPayload = {
  userId: string;
  category: BackendItemCategory;
  unit: BackendMeasurementUnit;
  name: string;
  defaultUnitCost?: number;
  minimumStock?: number;
  supplierId?: string;
};

export type UpdateItemPayload = Partial<Omit<CreateItemPayload, 'userId'>>;

export type DeletedItem = {
  id: string;
  name: string;
};

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
}
