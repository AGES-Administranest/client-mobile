import { useCallback, useEffect, useState } from 'react';

import type { Client } from '../domain/client';
import {
  applyClinicDraft,
  clientToClinicDraft,
  EMPTY_CLINIC_DRAFT,
  isClinicDraftValid,
  maskClinicField,
  validateClinicDraft,
  type ClinicDraft,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';

export type ClinicDetailState = {
  draft: ClinicDraft;
  errors: ClinicDraftErrors;
  isEditing: boolean;
  startEditing: () => void;
  setField: (field: ClinicField, value: string) => void;
  submit: () => Client | null;
};

export function useClinicDetail(clinic: Client | null): ClinicDetailState {
  const [draft, setDraft] = useState<ClinicDraft>(EMPTY_CLINIC_DRAFT);
  const [errors, setErrors] = useState<ClinicDraftErrors>({});
  const [isEditing, setIsEditing] = useState(false);

  // Sem clínica (sheet fechando) o rascunho fica como está, para o conteúdo
  // não piscar vazio durante a animação de saída.
  useEffect(() => {
    if (!clinic) {
      return;
    }
    setDraft(clientToClinicDraft(clinic));
    setErrors({});
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

  const submit = useCallback(() => {
    const validationErrors = validateClinicDraft(draft);
    setErrors(validationErrors);

    if (!clinic || !isClinicDraftValid(validationErrors)) {
      return null;
    }
    return applyClinicDraft(clinic, draft);
  }, [clinic, draft]);

  return { draft, errors, isEditing, startEditing, setField, submit };
}
