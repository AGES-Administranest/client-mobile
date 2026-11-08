import { apiClient } from 'shared/services/apiClient';

import type { Supplier, SupplierPayload } from '../domain/supplierForm';

// QuerySupplierDto limita `limit` a 100 (@Max(100)).
const MAX_PAGE_SIZE = 100;

// O CNPJ é o único tipo de documento aceito; taxId e taxIdType andam juntos.
const toBody = ({ active: _active, ...rest }: SupplierPayload) => ({
  ...rest,
  taxIdType: rest.taxId ? 'CNPJ' : null,
});

// O backend só devolve inativos com active=false explícito, então são duas
// buscas; ativos primeiro.
export async function fetchSuppliers(idToken: string): Promise<Supplier[]> {
  const fetchByStatus = (active: boolean) => {
    const query = new URLSearchParams({
      active: String(active),
      page: '1',
      limit: String(MAX_PAGE_SIZE),
    });
    return apiClient.get<Supplier[]>(`/supplier?${query.toString()}`, {
      token: idToken,
    });
  };
  const [active, inactive] = await Promise.all([
    fetchByStatus(true),
    fetchByStatus(false),
  ]);
  return [...active, ...inactive];
}

// CreateSupplierDto não tem `active`: todo fornecedor nasce ativo.
export async function createSupplier(
  idToken: string,
  payload: SupplierPayload,
): Promise<Supplier> {
  return apiClient.post<Supplier>('/supplier', toBody(payload), {
    token: idToken,
  });
}

export async function updateSupplier(
  idToken: string,
  id: string,
  payload: SupplierPayload,
): Promise<Supplier> {
  return apiClient.patch<Supplier>(
    `/supplier/${id}`,
    { ...toBody(payload), active: payload.active },
    { token: idToken },
  );
}

// DELETE só inativa (active: false): o fornecedor continua na lista.
export async function deleteSupplier(
  idToken: string,
  id: string,
): Promise<void> {
  await apiClient.delete<Supplier>(`/supplier/${id}`, {
    token: idToken,
  });
}
