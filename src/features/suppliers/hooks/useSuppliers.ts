import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import type { Supplier, SupplierPayload } from '../domain/supplierForm';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from '../services/supplierService';

// O backend recusa um segundo fornecedor com o mesmo CNPJ (409).
export const DUPLICATED_TAX_ID = 'duplicatedTaxId';

export type SaveResult = Supplier | typeof DUPLICATED_TAX_ID | null;

const isDuplicatedTaxId = (error: unknown) =>
  error instanceof ApiError && error.code === 'DUPLICATED_SUPPLIER_TAX_ID';

// Inativos ficam no fim da lista; a ordem dentro de cada grupo é mantida.
const activeFirst = (list: Supplier[]) => [
  ...list.filter(supplier => supplier.active),
  ...list.filter(supplier => !supplier.active),
];

export type SuppliersState = {
  suppliers: Supplier[];
  isLoading: boolean;
  failure: TranslationKey | null;
  create: (payload: SupplierPayload) => Promise<SaveResult>;
  update: (id: string, payload: SupplierPayload) => Promise<SaveResult>;
  remove: (id: string) => Promise<boolean>;
};

export function useSuppliers(): SuppliersState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!idToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFailure(null);

    fetchSuppliers(idToken)
      .then(loaded => {
        if (isMounted) setSuppliers(loaded);
      })
      .catch(() => {
        if (isMounted) setFailure('suppliers.loadFailure');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idToken]);

  const create = useCallback(
    async (payload: SupplierPayload) => {
      if (!idToken) return null;
      try {
        const created = await createSupplier(idToken, payload);
        setSuppliers(current => activeFirst([...current, created]));
        return created;
      } catch (error) {
        if (isDuplicatedTaxId(error)) return DUPLICATED_TAX_ID;
        return null;
      }
    },
    [idToken],
  );

  const update = useCallback(
    async (id: string, payload: SupplierPayload) => {
      if (!idToken) return null;
      try {
        const updated = await updateSupplier(idToken, id, payload);
        setSuppliers(current =>
          activeFirst(
            current.map(supplier => (supplier.id === id ? updated : supplier)),
          ),
        );
        return updated;
      } catch (error) {
        if (isDuplicatedTaxId(error)) return DUPLICATED_TAX_ID;
        return null;
      }
    },
    [idToken],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!idToken) return false;
      try {
        await deleteSupplier(idToken, id);
        setSuppliers(current =>
          activeFirst(
            current.map(supplier =>
              supplier.id === id ? { ...supplier, active: false } : supplier,
            ),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [idToken],
  );

  return { suppliers, isLoading, failure, create, update, remove };
}
