import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import {
  isCategoryInvalidError,
  isEntryNotFoundError,
  requireToken,
  toEditFailureKey,
  toEntryFailureKey,
} from './entryFailure';
import {
  useFinancialCategories,
  type CategoriesStatus,
} from './useFinancialCategories';
import {
  changeNature,
  createEmptyDraft,
  draftFromEntry,
  hasDraftChanges,
  isEntryDraftValid,
  maskEntryField,
  selectCategory,
  toCreatePayload,
  toUpdatePayload,
  validateEntryDraft,
  type EntryDraft,
  type EntryDraftErrors,
  type EntryTextField,
} from '../domain/entryForm';
import { lockedFieldsOf, type LockedEntryField } from '../domain/entryOrigin';
import { categoriesFor } from '../domain/financialCategory';
import type {
  EntryNature,
  EntryScope,
  FinancialCategory,
  FinancialEntry,
} from '../domain/financialEntry';
import {
  createFinancialEntry,
  updateFinancialEntry,
} from '../services/financialEntryService';

export type NewEntryFormState = {
  draft: EntryDraft;
  errors: EntryDraftErrors;
  failure: TranslationKey | null;
  /** A edição chegou a um lançamento que não existe mais (404). */
  entryIsGone: boolean;
  isSaving: boolean;
  canSubmit: boolean;
  categories: FinancialCategory[];
  categoriesStatus: CategoriesStatus;
  categoriesFailure: TranslationKey | null;
  editedEntry: FinancialEntry | null;
  hasChanges: boolean;
  lockedFields: readonly LockedEntryField[];
  setNature: (nature: EntryNature) => void;
  setField: (field: EntryTextField, value: string) => void;
  chooseCategory: (category: FinancialCategory) => void;
  clearCategory: () => void;
  addCategory: (category: FinancialCategory) => void;
  setScope: (scope: EntryScope) => void;
  reloadCategories: () => void;
  startNewEntry: () => void;
  startEditing: (entry: FinancialEntry) => void;
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
  const [entryIsGone, setEntryIsGone] = useState(false);
  const [editedEntry, setEditedEntry] = useState<FinancialEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {
    categories: allCategories,
    status: categoriesStatus,
    failure: categoriesFailure,
    reload: reloadCategories,
    reloadIfFailed: reloadCategoriesIfFailed,
    add: addToCategories,
  } = useFinancialCategories();
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

  const errors = useMemo(
    () => (hasTriedToSave ? validateEntryDraft(draft) : {}),
    [hasTriedToSave, draft],
  );

  const categories = useMemo(
    () => categoriesFor(draft.nature, allCategories),
    [draft.nature, allCategories],
  );

  const lockedFields = useMemo(
    () => (editedEntry ? lockedFieldsOf(editedEntry) : []),
    [editedEntry],
  );

  const setNature = useCallback(
    (nature: EntryNature) => {
      if (lockedFields.includes('nature')) return;
      setDraft(current => changeNature(current, nature));
    },
    [lockedFields],
  );

  const setField = useCallback(
    (field: EntryTextField, value: string) => {
      if (field !== 'description' && lockedFields.includes(field)) return;
      setDraft(current => ({
        ...current,
        [field]: maskEntryField(field, value),
      }));
    },
    [lockedFields],
  );

  const chooseCategory = useCallback((category: FinancialCategory) => {
    setDraft(current => selectCategory(current, category));
  }, []);

  const setScope = useCallback((scope: EntryScope) => {
    setDraft(current => ({ ...current, scope }));
  }, []);

  const clearCategory = useCallback(() => {
    setDraft(current =>
      current.categoryId === null ? current : { ...current, categoryId: null },
    );
  }, []);

  const addCategory = useCallback(
    (category: FinancialCategory) => {
      addToCategories(category);
      setDraft(current => selectCategory(current, category));
    },
    [addToCategories],
  );

  const forgetRejectedCategory = useCallback(() => {
    setDraft(current => ({ ...current, categoryId: null }));
    reloadCategories();
  }, [reloadCategories]);

  const restart = useCallback(
    (startingDraft: EntryDraft, entry: FinancialEntry | null) => {
      formGeneration.current += 1;
      isSending.current = false;
      entryId.current = randomUUID();
      setEditedEntry(entry);
      setDraft(startingDraft);
      setHasTriedToSave(false);
      setFailure(null);
      setEntryIsGone(false);
      setIsSaving(false);
      reloadCategoriesIfFailed();
    },
    [reloadCategoriesIfFailed],
  );

  const startNewEntry = useCallback(() => {
    restart(createEmptyDraft(new Date()), null);
  }, [restart]);

  const startEditing = useCallback(
    (entry: FinancialEntry) => {
      restart(draftFromEntry(entry), entry);
    },
    [restart],
  );

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
      if (editedEntry) {
        if (!hasDraftChanges(draft, editedEntry)) return editedEntry;
        return await updateFinancialEntry(
          requireToken(idToken),
          editedEntry.id,
          toUpdatePayload(draft, editedEntry),
        );
      }
      return await createFinancialEntry(
        requireToken(idToken),
        toCreatePayload(draft, entryId.current ?? randomUUID()),
      );
    } catch (error) {
      if (!isCurrent()) return null;
      if (isCategoryInvalidError(error)) forgetRejectedCategory();
      if (editedEntry) {
        setEntryIsGone(isEntryNotFoundError(error));
        setFailure(toEditFailureKey(error));
        return null;
      }
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
  }, [draft, editedEntry, idToken, forgetRejectedCategory]);

  return {
    draft,
    errors,
    failure,
    entryIsGone,
    isSaving,
    canSubmit: !isSaving && isEntryDraftValid(errors),
    categories,
    categoriesStatus,
    categoriesFailure,
    editedEntry,
    hasChanges: editedEntry ? hasDraftChanges(draft, editedEntry) : false,
    lockedFields,
    setNature,
    setField,
    chooseCategory,
    clearCategory,
    addCategory,
    setScope,
    reloadCategories,
    startNewEntry,
    startEditing,
    submit,
  };
}
