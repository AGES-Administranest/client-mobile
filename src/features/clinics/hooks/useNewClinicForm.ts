import { useCallback, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  findOfflineDuplicates,
  queueClinicCreate,
  type OfflineDuplicates,
} from 'features/clients';
import type { TranslationKey } from 'shared/i18n';
import { isNetworkError } from 'shared/utils/network';

import {
  isDuplicatedTaxIdError,
  requireToken,
  toClinicFailureKey,
} from './clinicFailure';
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
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
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

  // Mesmo retorno que o backend daria: CNPJ repetido no campo, nome repetido
  // no aviso do formulário.
  const applyDuplicates = useCallback((duplicates: OfflineDuplicates) => {
    if (duplicates.taxId) {
      setErrors(current => ({ ...current, cnpj: 'duplicated' }));
    }
    if (duplicates.name) {
      setFailure('clinics.newClinic.failures.duplicatedName');
    }
  }, []);

  // Sem rede a clínica entra na fila e já aparece na lista (e no campo Local
  // do agendamento); vai para o backend quando a conexão voltar.
  const saveOffline = useCallback(
    async (
      ownerId: string,
      payload: ReturnType<typeof toCreateClientPayload>,
    ): Promise<Client | null> => {
      try {
        const duplicates = await findOfflineDuplicates(ownerId, payload);
        if (duplicates.taxId || duplicates.name) {
          applyDuplicates(duplicates);
          return null;
        }
        return await queueClinicCreate(ownerId, payload);
      } catch {
        setFailure('clinics.newClinic.failures.unknown');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [applyDuplicates],
  );

  const submit = useCallback(async () => {
    const validationErrors = validateClinicDraft(draft);
    setErrors(validationErrors);
    setFailure(null);

    if (!isClinicDraftValid(validationErrors)) {
      return null;
    }

    setIsSaving(true);
    const payload = toCreateClientPayload(draft);

    try {
      const client = await createClient(requireToken(idToken), payload);
      setIsSaving(false);
      return client;
    } catch (error) {
      if (userId && isNetworkError(error)) {
        return saveOffline(userId, payload);
      }
      setIsSaving(false);
      if (isDuplicatedTaxIdError(error)) {
        setErrors(current => ({ ...current, cnpj: 'duplicated' }));
      } else {
        setFailure(toClinicFailureKey(error));
      }
      return null;
    }
  }, [draft, idToken, userId, saveOffline]);

  return { draft, errors, failure, isSaving, setField, reset, submit };
}
