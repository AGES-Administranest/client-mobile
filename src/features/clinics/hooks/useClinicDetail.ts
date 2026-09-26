import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import { requireToken, toClinicFailureKey } from './clinicFailure';
import type { Client } from '../domain/client';
import {
  clientToClinicDraft,
  EMPTY_CLINIC_DRAFT,
  isClinicDraftValid,
  maskClinicField,
  toCreateClientPayload,
  validateClinicDraft,
  type ClinicDraft,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';
import { deleteClient, updateClient } from '../services/clientService';

export type ClinicDetailState = {
  draft: ClinicDraft;
  errors: ClinicDraftErrors;
  failure: TranslationKey | null;
  isEditing: boolean;
  isSaving: boolean;
  startEditing: () => void;
  setField: (field: ClinicField, value: string) => void;
  submit: () => Promise<Client | null>;
  remove: () => Promise<boolean>;
};

export function useClinicDetail(clinic: Client | null): ClinicDetailState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [draft, setDraft] = useState<ClinicDraft>(EMPTY_CLINIC_DRAFT);
  const [errors, setErrors] = useState<ClinicDraftErrors>({});
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!clinic) {
      return;
    }
    setDraft(clientToClinicDraft(clinic));
    setErrors({});
    setFailure(null);
    setIsEditing(false);
  }, [clinic]);

  const startEditing = useCallback(() => setIsEditing(true), []);

  const setField = useCallback((field: ClinicField, value: string) => {
    setDraft(current => ({
      ...current,
      [field]: maskClinicField(field, value),
    }));
    setErrors(current => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const call = useCallback(
    async <T>(request: (token: string) => Promise<T>): Promise<T | null> => {
      setFailure(null);
      setIsSaving(true);
      try {
        return await request(requireToken(idToken));
      } catch (error) {
        setFailure(toClinicFailureKey(error));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [idToken],
  );

  const submit = useCallback(async () => {
    const validationErrors = validateClinicDraft(draft);
    setErrors(validationErrors);

    if (!clinic || !isClinicDraftValid(validationErrors)) {
      return null;
    }
    return call(token =>
      updateClient(token, clinic.id, toCreateClientPayload(draft)),
    );
  }, [call, clinic, draft]);

  const remove = useCallback(async () => {
    if (!clinic) {
      return false;
    }
    return (await call(token => deleteClient(token, clinic.id))) !== null;
  }, [call, clinic]);

  return {
    draft,
    errors,
    failure,
    isEditing,
    isSaving,
    startEditing,
    setField,
    submit,
    remove,
  };
}
