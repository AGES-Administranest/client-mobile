import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import {
  isCategoryInvalidError,
  isEntryNotFoundError,
  requireToken,
  toCategoriesFailureKey,
  toEntryFailureKey,
} from './entryFailure';
import {
  changeNature,
  createEmptyDraft,
  isEntryDraftValid,
  maskEntryField,
  selectCategory,
  toCreatePayload,
  validateEntryDraft,
  type EntryDraft,
  type EntryDraftErrors,
  type EntryTextField,
} from '../domain/entryForm';
import { categoriesFor } from '../domain/financialCategory';
import type {
  EntryNature,
  EntryScope,
  FinancialCategory,
  FinancialEntry,
} from '../domain/financialEntry';
import {
  createFinancialEntry,
  fetchFinancialCategories,
} from '../services/financialEntryService';

export type CategoriesStatus = 'loading' | 'ready' | 'failed';

export type NewEntryFormState = {
  draft: EntryDraft;
  errors: EntryDraftErrors;
  failure: TranslationKey | null;
  isSaving: boolean;
  canSubmit: boolean;
  categories: FinancialCategory[];
  categoriesStatus: CategoriesStatus;
  categoriesFailure: TranslationKey | null;
  setNature: (nature: EntryNature) => void;
  setField: (field: EntryTextField, value: string) => void;
  chooseCategory: (category: FinancialCategory) => void;
  setScope: (scope: EntryScope) => void;
  reloadCategories: () => void;
  startNewEntry: () => void;
  submit: () => Promise<FinancialEntry | null>;
};

export function useNewEntryForm(): NewEntryFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [draft, setDraft] = useState<EntryDraft>(() =>
    createEmptyDraft(new Date()),
  );
  const [hasTriedToSave, setHasTriedToSave] = useState(false);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<FinancialCategory[]>([]);
  const [categoriesStatus, setCategoriesStatus] =
    useState<CategoriesStatus>('loading');
  const [categoriesFailure, setCategoriesFailure] =
    useState<TranslationKey | null>(null);
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const lastCategoriesLoadFailed = useRef(false);
  // Gerado ao abrir o formulário (ADR-09) e mantido entre tentativas: se a
  // resposta se perder, reenviar o mesmo id não duplica o lançamento.
  const entryId = useRef<string | null>(null);
  entryId.current ??= randomUUID();
  // Um lançamento novo não pode receber a resposta de um envio anterior.
  const formGeneration = useRef(0);
  const isSending = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCategoriesStatus('loading');
    setCategoriesFailure(null);

    Promise.resolve()
      .then(() => fetchFinancialCategories(requireToken(idToken)))
      .then(loaded => {
        if (!active) return;
        lastCategoriesLoadFailed.current = false;
        setAllCategories(loaded);
        setCategoriesStatus('ready');
      })
      .catch(error => {
        if (!active) return;
        lastCategoriesLoadFailed.current = true;
        setCategoriesStatus('failed');
        setCategoriesFailure(toCategoriesFailureKey(error));
      });

    return () => {
      active = false;
    };
  }, [idToken, categoriesVersion]);

  const errors = useMemo(
    () => (hasTriedToSave ? validateEntryDraft(draft) : {}),
    [hasTriedToSave, draft],
  );

  const categories = useMemo(
    () => categoriesFor(draft.nature, allCategories),
    [draft.nature, allCategories],
  );

  const setNature = useCallback((nature: EntryNature) => {
    setDraft(current => changeNature(current, nature));
  }, []);

  const setField = useCallback((field: EntryTextField, value: string) => {
    setDraft(current => ({
      ...current,
      [field]: maskEntryField(field, value),
    }));
  }, []);

  const chooseCategory = useCallback((category: FinancialCategory) => {
    setDraft(current => selectCategory(current, category));
  }, []);

  const setScope = useCallback((scope: EntryScope) => {
    setDraft(current => ({ ...current, scope }));
  }, []);

  const reloadCategories = useCallback(() => {
    setCategoriesVersion(current => current + 1);
  }, []);

  const forgetRejectedCategory = useCallback(() => {
    setDraft(current => ({ ...current, categoryId: null }));
    reloadCategories();
  }, [reloadCategories]);

  const startNewEntry = useCallback(() => {
    formGeneration.current += 1;
    isSending.current = false;
    entryId.current = randomUUID();
    setDraft(createEmptyDraft(new Date()));
    setHasTriedToSave(false);
    setFailure(null);
    setIsSaving(false);
    if (lastCategoriesLoadFailed.current) {
      reloadCategories();
    }
  }, [reloadCategories]);

  const submit = useCallback(async () => {
    // Dois toques antes do próximo render não podem mandar dois POSTs.
    if (isSending.current) {
      return null;
    }
    setHasTriedToSave(true);
    setFailure(null);

    if (!isEntryDraftValid(validateEntryDraft(draft))) {
      return null;
    }

    const generation = formGeneration.current;
    const isCurrent = () =>
      isMounted.current && generation === formGeneration.current;
    isSending.current = true;
    setIsSaving(true);
    try {
      return await createFinancialEntry(
        requireToken(idToken),
        toCreatePayload(draft, entryId.current ?? randomUUID()),
      );
    } catch (error) {
      if (!isCurrent()) return null;
      if (isCategoryInvalidError(error)) forgetRejectedCategory();
      // O id ficou preso a um lançamento apagado ou de outra conta: tentar de
      // novo com ele daria o mesmo erro para sempre.
      if (isEntryNotFoundError(error)) entryId.current = randomUUID();
      setFailure(toEntryFailureKey(error));
      return null;
    } finally {
      if (isCurrent()) {
        isSending.current = false;
        setIsSaving(false);
      }
    }
  }, [draft, idToken, forgetRejectedCategory]);

  return {
    draft,
    errors,
    failure,
    isSaving,
    canSubmit: !isSaving && isEntryDraftValid(errors),
    categories,
    categoriesStatus,
    categoriesFailure,
    setNature,
    setField,
    chooseCategory,
    setScope,
    reloadCategories,
    startNewEntry,
    submit,
  };
}
