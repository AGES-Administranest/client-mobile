import { apiClient } from 'shared/services/apiClient';
import { sessionStore } from 'shared/services/sessionStore';

export type Supplier = {
  id: string;
  name: string;
  taxId: string | null;
  taxIdType: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// userId vem da sessão dentro do service, como nas rotas de item.
export type CreateSupplierPayload = {
  name: string;
};

// QuerySupplierDto limita `limit` a 100 (@Max(100)).
const MAX_PAGE_SIZE = 100;

function requireSession() {
  const session = sessionStore.get();
  if (!session?.userId) {
    throw new Error(
      'No active session: sign in first, or set EXPO_PUBLIC_DEV_USER_ID and EXPO_PUBLIC_DEV_ID_TOKEN.',
    );
  }
  return session;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const session = requireSession();
  const query = new URLSearchParams({
    userId: session.userId,
    active: 'true',
    page: '1',
    limit: String(MAX_PAGE_SIZE),
  });
  return apiClient.get<Supplier[]>(`/supplier?${query.toString()}`, {
    token: session.idToken,
  });
}

export async function createSupplier(
  payload: CreateSupplierPayload,
): Promise<Supplier> {
  const session = requireSession();
  return apiClient.post<Supplier>(
    '/supplier',
    { ...payload, userId: session.userId },
    { token: session.idToken },
  );
}
