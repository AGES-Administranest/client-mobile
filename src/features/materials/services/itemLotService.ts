import { apiClient } from 'shared/services/apiClient';

// Idem itemService: o dono sai do token, nunca de um userId no corpo.
export type CreateItemLotPayload = {
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

export async function createItemLot(
  idToken: string,
  itemId: string,
  payload: CreateItemLotPayload,
): Promise<ItemLotResult> {
  return apiClient.post<ItemLotResult>(`/item/${itemId}/lot`, payload, {
    token: idToken,
  });
}
