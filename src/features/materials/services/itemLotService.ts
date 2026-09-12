import { apiClient } from 'shared/services/apiClient';
import { sessionStore } from 'shared/services/sessionStore';

// Idem itemService: o userId vem da sessão, não do chamador.
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

// CreateItemLotDto exige userId UUID; sem sessão a chamada só pode dar 400.
function requireSession() {
  const session = sessionStore.get();
  if (!session?.userId) {
    throw new Error(
      'No active session: sign in first, or set EXPO_PUBLIC_DEV_USER_ID and EXPO_PUBLIC_DEV_ID_TOKEN.',
    );
  }
  return session;
}

export async function createItemLot(
  itemId: string,
  payload: CreateItemLotPayload,
): Promise<ItemLotResult> {
  const session = requireSession();
  return apiClient.post<ItemLotResult>(
    `/item/${itemId}/lot`,
    { ...payload, userId: session.userId },
    { token: session.idToken },
  );
}
