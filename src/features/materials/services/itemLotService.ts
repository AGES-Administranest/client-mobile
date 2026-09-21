import { apiClient } from 'shared/services/apiClient';
<<<<<<< HEAD
import { sessionStore } from 'shared/services/sessionStore';

export type CreateItemLotPayload = {
  userId: string;
=======

// Idem itemService: o dono sai do token, nunca de um userId no corpo.
export type CreateItemLotPayload = {
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
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

<<<<<<< HEAD
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
=======
export async function createItemLot(
  idToken: string,
  itemId: string,
  payload: CreateItemLotPayload,
): Promise<ItemLotResult> {
  return apiClient.post<ItemLotResult>(`/item/${itemId}/lot`, payload, {
    token: idToken,
  });
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
}
