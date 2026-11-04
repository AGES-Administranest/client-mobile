import { useCallback, useState } from 'react';

import {
  EMPTY_SUPPLIER_DRAFT,
  isSupplierDraftValid,
  toSupplierPayload,
  validateSupplierDraft,
  type SupplierDraft,
  type SupplierDraftErrors,
  type SupplierField,
  type SupplierPayload,
} from '../domain/supplierForm';

export type SupplierFormState = {
  draft: SupplierDraft;
  errors: SupplierDraftErrors;
  setField: (field: SupplierField, value: string) => void;
  setActive: (active: boolean) => void;
  reset: (initial?: SupplierDraft) => void;
  validate: () => SupplierPayload | null;
};

export function useSupplierForm(): SupplierFormState {
  const [draft, setDraft] = useState<SupplierDraft>(EMPTY_SUPPLIER_DRAFT);
  const [errors, setErrors] = useState<SupplierDraftErrors>({});

  const setField = useCallback((field: SupplierField, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const setActive = useCallback(
    (active: boolean) => setDraft(current => ({ ...current, active })),
    [],
  );

  const reset = useCallback((initial: SupplierDraft = EMPTY_SUPPLIER_DRAFT) => {
    setDraft(initial);
    setErrors({});
  }, []);

  const validate = useCallback(() => {
    const found = validateSupplierDraft(draft);
    setErrors(found);
    return isSupplierDraftValid(found) ? toSupplierPayload(draft) : null;
  }, [draft]);

  return { draft, errors, setField, setActive, reset, validate };
}
