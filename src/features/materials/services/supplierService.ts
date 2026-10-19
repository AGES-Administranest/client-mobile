import { apiClient } from 'shared/services/apiClient';

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

// Como nas rotas de item, o dono vem do token: userId no corpo ou na query
// é 400.
export type CreateSupplierPayload = {
  name: string;
};

// QuerySupplierDto limita `limit` a 100 (@Max(100)).
const MAX_PAGE_SIZE = 100;

export async function fetchSuppliers(idToken: string): Promise<Supplier[]> {
  const query = new URLSearchParams({
    active: 'true',
    page: '1',
    limit: String(MAX_PAGE_SIZE),
  });
  return apiClient.get<Supplier[]>(`/supplier?${query.toString()}`, {
    token: idToken,
  });
}

export async function createSupplier(
  idToken: string,
  payload: CreateSupplierPayload,
): Promise<Supplier> {
  return apiClient.post<Supplier>('/supplier', payload, { token: idToken });
}
