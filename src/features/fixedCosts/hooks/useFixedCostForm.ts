import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import type { FixedCost, FixedCostCategory } from '../domain/fixedCost';
import {
  EMPTY_FIXED_COST_DRAFT,
  isFixedCostDraftValid,
  toFixedCostPayload,
  validateFixedCostDraft,
  type FixedCostDraft,
  type FixedCostDraftErrors,
  type FixedCostField,
} from '../domain/validateFixedCostForm';
import { createFixedCost, updateFixedCost } from '../services/fixedCostService';

export type FixedCostFormState = {
  draft: FixedCostDraft;
  errors: FixedCostDraftErrors;
  isEditing: boolean;
  isSaving: boolean;
  isDeactivating: boolean;
  failure: 'session' | 'unknown' | null;
  setField: (field: FixedCostField, value: string) => void;
  setCategory: (category: FixedCostCategory) => void;
  submit: () => Promise<FixedCost | null>;
  deactivate: () => Promise<FixedCost | null>;
  reset: () => void;
};

function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

function failureFor(error: unknown): 'session' | 'unknown' {
  return error instanceof ApiError && error.status === 401
    ? 'session'
    : 'unknown';
}

function draftOf(fixedCost: FixedCost): FixedCostDraft {
  return {
    description: fixedCost.description,
    monthlyAmount: String(fixedCost.monthlyAmount).replace('.', ','),
    category: fixedCost.category,
  };
}

/**
 * Formulário de cadastro e edição de um custo fixo (US18). Sem `editing`, o
 * hook está em modo cadastro; com ele, em modo edição — inclusive habilitando
 * `deactivate`, que marca o custo como inativo sem apagá-lo (regra de
 * negócio da US18: o histórico fica).
 */
export function useFixedCostForm(
  editing: FixedCost | null,
): FixedCostFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;

  const [draft, setDraft] = useState<FixedCostDraft>(EMPTY_FIXED_COST_DRAFT);
  const [errors, setErrors] = useState<FixedCostDraftErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [failure, setFailure] = useState<'session' | 'unknown' | null>(null);

  useEffect(() => {
    setDraft(editing ? draftOf(editing) : EMPTY_FIXED_COST_DRAFT);
    setErrors({});
    setFailure(null);
  }, [editing]);

  const setField = useCallback((field: FixedCostField, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const setCategory = useCallback((category: FixedCostCategory) => {
    setDraft(current => ({ ...current, category }));
    setErrors(current => {
      if (current.category === undefined) {
        return current;
      }
      const next = { ...current };
      delete next.category;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(editing ? draftOf(editing) : EMPTY_FIXED_COST_DRAFT);
    setErrors({});
    setFailure(null);
    setIsSaving(false);
  }, [editing]);

  const submit = useCallback(async (): Promise<FixedCost | null> => {
    const validationErrors = validateFixedCostDraft(draft);
    setErrors(validationErrors);
    setFailure(null);

    if (!isFixedCostDraftValid(validationErrors)) {
      return null;
    }

    const payload = toFixedCostPayload(draft);
    setIsSaving(true);

    try {
      const token = requireToken(idToken);

      if (editing) {
        const { updatedAt } = await updateFixedCost(token, editing.id, payload);
        return { ...editing, ...payload, updatedAt };
      }

      const created = await createFixedCost(token, payload);
      return created;
    } catch (error) {
      setFailure(failureFor(error));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draft, editing, idToken]);

  const deactivate = useCallback(async (): Promise<FixedCost | null> => {
    if (!editing) {
      return null;
    }

    setFailure(null);
    setIsDeactivating(true);

    try {
      const token = requireToken(idToken);
      const { updatedAt } = await updateFixedCost(token, editing.id, {
        active: false,
      });
      return { ...editing, active: false, updatedAt };
    } catch (error) {
      setFailure(failureFor(error));
      return null;
    } finally {
      setIsDeactivating(false);
    }
  }, [editing, idToken]);

  return {
    draft,
    errors,
    isEditing: editing !== null,
    isSaving,
    isDeactivating,
    failure,
    setField,
    setCategory,
    submit,
    deactivate,
    reset,
  };
}
