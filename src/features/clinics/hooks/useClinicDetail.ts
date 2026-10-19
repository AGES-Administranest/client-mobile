import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import {
  findOfflineDuplicates,
  isLocalClientId,
  queueClinicUpdate,
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
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
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
    async <T>(
      request: (token: string) => Promise<T>,
      // Deixa o chamador tratar um erro específico (ex: CNPJ duplicado como
      // erro do campo) em vez do banner genérico; volta `false` para manter
      // o comportamento padrão.
      onError?: (error: unknown) => boolean,
    ): Promise<T | null> => {
      setFailure(null);
      setIsSaving(true);
      try {
        return await request(requireToken(idToken));
      } catch (error) {
        if (!onError?.(error)) {
          setFailure(toClinicFailureKey(error));
        }
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
    const changes = toCreateClientPayload(draft);
    // Clínica criada offline ainda não existe no backend; sem rede, a edição
    // de qualquer uma entra na fila e vale na lista na hora.
    const saveOffline = async (): Promise<Client | null> => {
      if (!userId) return null;
      const duplicates = await findOfflineDuplicates(
        userId,
        changes,
        clinic.id,
      );
      if (duplicates.taxId) {
        setErrors(current => ({ ...current, cnpj: 'duplicated' }));
      }
      if (duplicates.name) {
        setFailure('clinics.newClinic.failures.duplicatedName');
      }
      if (duplicates.taxId || duplicates.name) {
        return null;
      }
      return queueClinicUpdate(userId, clinic.id, changes);
    };
    if (userId && isLocalClientId(clinic.id)) {
      return call(() => saveOffline());
    }
    let wentOffline = false;
    const updated = await call(
      token => updateClient(token, clinic.id, changes),
      error => {
        if (userId && isNetworkError(error)) {
          wentOffline = true;
          return true;
        }
        if (!isDuplicatedTaxIdError(error)) {
          return false;
        }
        setErrors(current => ({ ...current, cnpj: 'duplicated' }));
        return true;
      },
    );
    return wentOffline ? call(() => saveOffline()) : updated;
  }, [call, clinic, draft, userId]);

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
