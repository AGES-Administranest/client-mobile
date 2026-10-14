import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import {
  duplicatedCategoryId,
  isCategoryIdConflictError,
  requireToken,
  toNewCategoryFailureKey,
} from './entryFailure';
import {
  filterCategories,
  findCategoryLabeled,
  shouldOfferNewCategory,
  toCreateCategoryPayload,
  validateNewCategoryName,
  type LabeledCategory,
} from '../domain/financialCategory';
import type {
  EntryNature,
  EntryScope,
  FinancialCategory,
} from '../domain/financialEntry';
import { createFinancialCategory } from '../services/financialEntryService';

type CategoryPickerOptions = {
  categories: readonly LabeledCategory[];
  nature: EntryNature;
  scope: EntryScope;
  selectedId: string | null;
  onChoose: (category: FinancialCategory) => void;
  onUnchoose: () => void;
  onCreate: (category: FinancialCategory) => void;
};

export type NewCategoryState = {
  name: string;
  error: 'tooLong' | null;
  canCreate: boolean;
  isSaving: boolean;
  failure: TranslationKey | null;
};

export type CategoryPickerState = {
  text: string;
  options: LabeledCategory[];
  offersNewCategory: boolean;
  hasNoMatch: boolean;
  wasJustCreated: boolean;
  newCategory: NewCategoryState | null;
  changeText: (text: string) => void;
  choose: (categoryId: string) => void;
  startNewCategory: () => void;
  changeNewName: (name: string) => void;
  createNewCategory: () => Promise<void>;
  reset: () => void;
};

export function useCategoryPicker({
  categories,
  nature,
  scope,
  selectedId,
  onChoose,
  onUnchoose,
  onCreate,
}: CategoryPickerOptions): CategoryPickerState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [typedTerm, setTypedTerm] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [wasJustCreated, setWasJustCreated] = useState(false);
  // Gerado ao começar a criar (ADR-09) e mantido entre tentativas: se a
  // resposta se perder, reenviar o mesmo id não cria a categoria duas vezes.
  const newCategoryId = useRef<string | null>(null);
  // Uma resposta que chega depois de trocar o tipo ou de sair da criação
  // não pode escolher a categoria por cima do que o usuário fez depois.
  const generation = useRef(0);
  const isSending = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const forgetPendingCreation = useCallback(() => {
    generation.current += 1;
    isSending.current = false;
    setIsSavingNew(false);
  }, []);

  const reset = useCallback(() => {
    forgetPendingCreation();
    newCategoryId.current = null;
    setTypedTerm(null);
    setNewName(null);
    setFailure(null);
    setWasJustCreated(false);
  }, [forgetPendingCreation]);

  useEffect(() => {
    reset();
  }, [nature, reset]);

  const leaveNewCategory = useCallback(() => {
    forgetPendingCreation();
    setNewName(null);
    setFailure(null);
  }, [forgetPendingCreation]);

  const term = typedTerm ?? '';
  const options = useMemo(
    () => filterCategories(categories, term),
    [categories, term],
  );
  const selectedLabel =
    categories.find(category => category.id === selectedId)?.label ?? '';

  const changeText = useCallback(
    (text: string) => {
      if (selectedId !== null) onUnchoose();
      if (newName !== null) leaveNewCategory();
      setTypedTerm(text);
      setWasJustCreated(false);
    },
    [selectedId, newName, onUnchoose, leaveNewCategory],
  );

  const choose = useCallback(
    (categoryId: string) => {
      const category = categories.find(({ id }) => id === categoryId);
      if (!category) return;
      onChoose(category);
      if (newName !== null) leaveNewCategory();
      setTypedTerm(null);
      setWasJustCreated(false);
    },
    [categories, newName, onChoose, leaveNewCategory],
  );

  const startNewCategory = useCallback(() => {
    const typed = typedTerm?.trim() ?? '';
    if (selectedId !== null) onUnchoose();
    newCategoryId.current ??= randomUUID();
    setNewName(current => typed || (current ?? ''));
    setTypedTerm(null);
    setFailure(null);
    setWasJustCreated(false);
  }, [typedTerm, selectedId, onUnchoose]);

  const changeNewName = useCallback((name: string) => {
    setNewName(name);
    setFailure(null);
  }, []);

  const finishNewCategory = useCallback(() => {
    newCategoryId.current = null;
    setNewName(null);
    setTypedTerm(null);
    setFailure(null);
  }, []);

  const nameProblem =
    newName === null ? undefined : validateNewCategoryName(newName, categories);

  const createNewCategory = useCallback(async () => {
    if (newName === null || isSending.current) return;
    if (nameProblem === 'duplicate') {
      const existing = findCategoryLabeled(categories, newName);
      if (existing) onChoose(existing);
      finishNewCategory();
      return;
    }
    if (nameProblem) return;

    const current = generation.current;
    const isCurrent = () => isMounted.current && current === generation.current;
    newCategoryId.current ??= randomUUID();
    const payload = toCreateCategoryPayload({
      id: newCategoryId.current,
      name: newName,
      nature,
      scope,
    });
    isSending.current = true;
    setIsSavingNew(true);
    setFailure(null);
    try {
      const created = await createFinancialCategory(
        requireToken(idToken),
        payload,
      );
      if (!isCurrent()) return;
      onCreate(created);
      finishNewCategory();
      setWasJustCreated(true);
    } catch (error) {
      if (!isCurrent()) return;
      const existingId = duplicatedCategoryId(error);
      if (existingId) {
        const existing = categories.find(({ id }) => id === existingId);
        if (existing) {
          onChoose(existing);
        } else {
          // Criada por um envio cuja resposta se perdeu: entra na lista com o
          // que já se sabe dela até o próximo carregamento.
          onCreate({
            id: existingId,
            name: payload.name,
            nature,
            defaultScope: scope,
            isDefault: false,
          });
        }
        finishNewCategory();
        return;
      }
      if (isCategoryIdConflictError(error)) {
        newCategoryId.current = randomUUID();
      }
      setFailure(toNewCategoryFailureKey(error));
    } finally {
      if (isCurrent()) {
        isSending.current = false;
        setIsSavingNew(false);
      }
    }
  }, [
    newName,
    nameProblem,
    categories,
    nature,
    scope,
    idToken,
    onChoose,
    onCreate,
    finishNewCategory,
  ]);

  return {
    text: typedTerm ?? selectedLabel,
    options,
    offersNewCategory: shouldOfferNewCategory(term, options),
    hasNoMatch: options.length === 0 && term.trim() !== '',
    wasJustCreated,
    newCategory:
      newName === null
        ? null
        : {
            name: newName,
            error: nameProblem === 'tooLong' ? 'tooLong' : null,
            canCreate:
              !isSavingNew &&
              (nameProblem === undefined || nameProblem === 'duplicate'),
            isSaving: isSavingNew,
            failure,
          },
    changeText,
    choose,
    startNewCategory,
    changeNewName,
    createNewCategory,
    reset,
  };
}
