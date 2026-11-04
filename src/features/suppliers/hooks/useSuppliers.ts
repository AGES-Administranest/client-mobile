import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import type { Supplier, SupplierPayload } from '../domain/supplierForm';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from '../services/supplierService';

export type SuppliersState = {
  suppliers: Supplier[];
  isLoading: boolean;
  failure: TranslationKey | null;
  create: (payload: SupplierPayload) => Promise<Supplier | null>;
  update: (id: string, payload: SupplierPayload) => Promise<Supplier | null>;
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
        setSuppliers(current => [...current, created]);
        return created;
      } catch {
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
          current.map(supplier => (supplier.id === id ? updated : supplier)),
        );
        return updated;
      } catch {
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
        setSuppliers(current => current.filter(supplier => supplier.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [idToken],
  );

  return { suppliers, isLoading, failure, create, update, remove };
}
