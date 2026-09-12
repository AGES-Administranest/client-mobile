import { apiClient } from 'shared/services/apiClient';
import { sessionStore } from 'shared/services/sessionStore';

export type CreateItemLotPayload = {
  userId: string;
  quantity: number;
  unitCost: number;
  expirationDate?: string;
  receivedOn: string;
  lotNumber?: string;
};

export type ItemLotResult = {
  id: string;
  itemId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  unitCost: string;
  currentQuantity: string;
  receivedOn: string;
  createdAt: string;
  updatedAt: string;
};

function authOptions() {
  const session = sessionStore.get();
  return session ? { token: session.idToken } : undefined;
}

export async function createItemLot(
  itemId: string,
  payload: CreateItemLotPayload,
): Promise<ItemLotResult> {
  return apiClient.post<ItemLotResult>(
    `/item/${itemId}/lot`,
    payload,
    authOptions(),
  );
}
