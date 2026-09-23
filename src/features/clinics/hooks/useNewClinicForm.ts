import { useCallback, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import type { Client } from '../domain/client';
import {
  EMPTY_CLINIC_DRAFT,
  isClinicDraftValid,
  maskClinicField,
  toCreateClientPayload,
  validateClinicDraft,
  type ClinicDraft,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';
import { createClient } from '../services/clientService';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  DUPLICATED_CLIENT_NAME: 'clinics.newClinic.failures.duplicatedName',
};

export type NewClinicFormState = {
  draft: ClinicDraft;
  errors: ClinicDraftErrors;
  failure: TranslationKey | null;
  isSaving: boolean;
  setField: (field: ClinicField, value: string) => void;
  reset: () => void;
  submit: () => Promise<Client | null>;
};

export function useNewClinicForm(): NewClinicFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [draft, setDraft] = useState<ClinicDraft>(EMPTY_CLINIC_DRAFT);
  const [errors, setErrors] = useState<ClinicDraftErrors>({});
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const reset = useCallback(() => {
    setDraft(EMPTY_CLINIC_DRAFT);
    setErrors({});
    setFailure(null);
    setIsSaving(false);
  }, []);

  const submit = useCallback(async () => {
    const validationErrors = validateClinicDraft(draft);
    setErrors(validationErrors);
    setFailure(null);

    if (!isClinicDraftValid(validationErrors)) {
      return null;
    }

    setIsSaving(true);

    try {
      const client = await createClient(
        requireToken(idToken),
        toCreateClientPayload(draft),
      );
      setIsSaving(false);
      return client;
    } catch (error) {
      setIsSaving(false);
      setFailure(toFailureKey(error));
      return null;
    }
  }, [draft, idToken]);

  return { draft, errors, failure, isSaving, setField, reset, submit };
}

function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

// Todo 401 vira a mensagem de sessão, como em materials: o id token ainda não
// é renovado antes das chamadas, então o que resolve é entrar de novo.
function toFailureKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) {
    return 'clinics.newClinic.failures.unknown';
  }
  if (error.status === 401) {
    return 'clinics.newClinic.failures.session';
  }
  return (
    (error.code && FAILURE_KEYS[error.code]) ||
    'clinics.newClinic.failures.unknown'
  );
}
