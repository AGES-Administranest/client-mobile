import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

import { isLocalSupplierId, toSupplierBody } from '../domain/offlineSuppliers';
import type { Supplier, SupplierPayload } from '../domain/supplierForm';
import {
  hasOfflineSupplierTaxId,
  loadSuppliersWithOffline,
  queueSupplierCreate,
  queueSupplierUpdate,
  subscribeOfflineSuppliers,
} from '../services/offlineSupplierStore';
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
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [version, setVersion] = useState(0);

  // A fila muda (cadastro offline, envio feito): a lista se refaz.
  useEffect(
    () => subscribeOfflineSuppliers(() => setVersion(current => current + 1)),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    if (!idToken) {
      setIsLoading(false);
      return;
    }
    setFailure(null);

    loadSuppliersWithOffline(userId, () => fetchSuppliers(idToken))
      .then(loaded => {
        if (isMounted) setSuppliers(activeFirst(loaded.suppliers));
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
  }, [idToken, userId, version]);

  const replace = useCallback((saved: Supplier) => {
    setSuppliers(current =>
      activeFirst(
        current.some(supplier => supplier.id === saved.id)
          ? current.map(supplier =>
              supplier.id === saved.id ? saved : supplier,
            )
          : [...current, saved],
      ),
    );
  }, []);

  const create = useCallback(
    async (payload: SupplierPayload): Promise<SaveResult> => {
      if (!idToken) return null;
      try {
        const created = await createSupplier(idToken, payload);
        replace(created);
        return created;
      } catch (error) {
        if (isDuplicatedTaxId(error)) return DUPLICATED_TAX_ID;
        if (!userId || !isNetworkError(error)) return null;
        if (
          payload.taxId &&
          (await hasOfflineSupplierTaxId(userId, payload.taxId))
        ) {
          return DUPLICATED_TAX_ID;
        }
        const queued = await queueSupplierCreate(
          userId,
          toSupplierBody(payload),
        );
        replace(queued);
        return queued;
      }
    },
    [idToken, userId, replace],
  );

  const update = useCallback(
    async (id: string, payload: SupplierPayload): Promise<SaveResult> => {
      if (!idToken) return null;
      const queue = async (): Promise<SaveResult> => {
        if (!userId) return null;
        if (
          payload.taxId &&
          (await hasOfflineSupplierTaxId(userId, payload.taxId, id))
        ) {
          return DUPLICATED_TAX_ID;
        }
        const queued = await queueSupplierUpdate(
          userId,
          id,
          toSupplierBody(payload),
        );
        if (queued) replace(queued);
        return queued;
      };
      // Um fornecedor que ainda nem existe no backend só se edita na fila.
      if (isLocalSupplierId(id)) return queue();
      try {
        const updated = await updateSupplier(idToken, id, payload);
        replace(updated);
        return updated;
      } catch (error) {
        if (isDuplicatedTaxId(error)) return DUPLICATED_TAX_ID;
        return isNetworkError(error) ? queue() : null;
      }
    },
    [idToken, userId, replace],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!idToken) return false;
      const inactivateInQueue = async () => {
        if (!userId) return false;
        const queued = await queueSupplierUpdate(userId, id, {
          active: false,
        });
        if (queued) replace(queued);
        return queued !== null;
      };
      if (isLocalSupplierId(id)) return inactivateInQueue();
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
      } catch (error) {
        return isNetworkError(error) ? inactivateInQueue() : false;
      }
    },
    [idToken, userId, replace],
  );

  return { suppliers, isLoading, failure, create, update, remove };
}
