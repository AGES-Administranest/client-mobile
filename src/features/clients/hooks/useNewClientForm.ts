import { useCallback, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import type { Client, ClientType } from '../domain/client';
import {
  EMPTY_NEW_CLIENT_DRAFT,
  hasNewClientErrors,
  toCreateClientPayload,
  validateNewClientDraft,
  type NewClientDraft,
  type NewClientErrors,
  type NewClientField,
} from '../domain/newClientForm';
import { createClient } from '../services/clientService';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  DUPLICATED_CLIENT_NAME: 'clients.newClient.failures.duplicatedName',
};

export type NewClientFormState = {
  draft: NewClientDraft;
  errors: NewClientErrors;
  failure: TranslationKey | null;
  isSaving: boolean;
  setField: (field: NewClientField, value: string) => void;
  setType: (type: ClientType) => void;
  reset: () => void;
  submit: () => Promise<Client | null>;
};

export function useNewClientForm(): NewClientFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [draft, setDraft] = useState<NewClientDraft>(EMPTY_NEW_CLIENT_DRAFT);
  const [errors, setErrors] = useState<NewClientErrors>({});
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback((field: NewClientField, value: string) => {
    setDraft(current => ({
      ...current,
      [field]: value,
    }));
    if (field === 'name') {
      setErrors(current => (current.name === undefined ? current : {}));
    }
  }, []);

  const setType = useCallback((type: ClientType) => {
    setDraft(current => ({ ...current, type }));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_NEW_CLIENT_DRAFT);
    setErrors({});
    setFailure(null);
    setIsSaving(false);
  }, []);

  const submit = useCallback(async () => {
    const validationErrors = validateNewClientDraft(draft);
    setErrors(validationErrors);
    setFailure(null);

    if (hasNewClientErrors(validationErrors)) {
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

  return { draft, errors, failure, isSaving, setField, setType, reset, submit };
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
    return 'clients.newClient.failures.unknown';
  }
  if (error.status === 401) {
    return 'clients.newClient.failures.session';
  }
  return (
    (error.code && FAILURE_KEYS[error.code]) ||
    'clients.newClient.failures.unknown'
  );
}
