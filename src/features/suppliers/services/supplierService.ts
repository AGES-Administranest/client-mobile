import type { Supplier, SupplierPayload } from '../domain/supplierForm';

// Stand-in: o backend de fornecedores (endereço, edição, exclusão e status)
// ainda não existe. Mesmas assinaturas da chamada real — o token do usuário
// primeiro, sem userId — para trocar por apiClient sem mexer nos hooks.
let stored: Supplier[] = [];
let nextId = 1;

export async function fetchSuppliers(_idToken: string): Promise<Supplier[]> {
  return Promise.resolve([...stored]);
}

export async function createSupplier(
  _idToken: string,
  payload: SupplierPayload,
): Promise<Supplier> {
  const created: Supplier = { id: `supplier-${nextId++}`, ...payload };
  stored = [...stored, created];
  return Promise.resolve(created);
}

export async function updateSupplier(
  _idToken: string,
  id: string,
  payload: SupplierPayload,
): Promise<Supplier> {
  const updated: Supplier = { id, ...payload };
  stored = stored.map(supplier => (supplier.id === id ? updated : supplier));
  return Promise.resolve(updated);
}

export async function deleteSupplier(
  _idToken: string,
  id: string,
): Promise<void> {
  stored = stored.filter(supplier => supplier.id !== id);
  return Promise.resolve();
}
