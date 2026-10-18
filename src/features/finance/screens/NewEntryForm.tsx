import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useTranslation } from 'shared/i18n';

import type { CategoryFieldState } from '../components/CategoryField';
import type { LockedFieldsState } from '../components/EntryFormFields';
import {
  NewEntrySheet,
  type EntryEditActions,
} from '../components/NewEntrySheet';
import {
  isEntryDraftValid,
  validateEntryDraft,
  type EntryField,
} from '../domain/entryForm';
import {
  defaultCategoryKey,
  type LabeledCategory,
} from '../domain/financialCategory';
import type { FinancialEntry } from '../domain/financialEntry';
import { originKeyOf } from '../domain/entryOrigin';
import { useCategoryPicker } from '../hooks/useCategoryPicker';
import { useNewEntryForm } from '../hooks/useNewEntryForm';

type NewEntryFormProps = {
  visible: boolean;
  /** Com um lançamento, o formulário edita esse lançamento em vez de criar. */
  entry?: FinancialEntry | null;
  onClose: () => void;
  onClosed?: () => void;
  onSaved: (entry: FinancialEntry) => void;
  /** A edição descobriu que o lançamento foi apagado em outro lugar. */
  onEntryGone?: () => void;
};

export function NewEntryForm({
  visible,
  entry = null,
  onClose,
  onClosed,
  onSaved,
  onEntryGone,
}: NewEntryFormProps) {
  const { t } = useTranslation();
  const form = useNewEntryForm();
  const labeledCategories = useMemo<LabeledCategory[]>(
    () =>
      form.categories.map(category => {
        const key = defaultCategoryKey(category);
        return {
          ...category,
          label: key ? t(`financialEntries.categories.${key}`) : category.name,
        };
      }),
    [form.categories, t],
  );
  const picker = useCategoryPicker({
    categories: labeledCategories,
    nature: form.draft.nature,
    scope: form.draft.scope,
    selectedId: form.draft.categoryId,
    onChoose: form.chooseCategory,
    onUnchoose: form.clearCategory,
    onCreate: form.addCategory,
  });
  const { startNewEntry, startEditing } = form;
  const { reset: resetPicker } = picker;
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setIsConfirmingDiscard(false);
    if (entry) {
      startEditing(entry);
    } else {
      startNewEntry();
      resetPicker();
    }
  }, [visible, entry, startNewEntry, startEditing, resetPicker]);

  const { entryIsGone } = form;
  useEffect(() => {
    if (entryIsGone) {
      onEntryGone?.();
    }
  }, [entryIsGone, onEntryGone]);

  const { newCategory } = picker;
  const category: CategoryFieldState = {
    status: form.categoriesStatus,
    loadFailure:
      form.categoriesStatus === 'failed'
        ? t(
            form.categoriesFailure ??
              'financialEntries.form.failures.categories',
          )
        : null,
    text: picker.text,
    options: picker.options,
    selectedId: form.draft.categoryId,
    offersNewCategory: picker.offersNewCategory,
    hasNoMatch: picker.hasNoMatch,
    wasJustCreated: picker.wasJustCreated,
    newCategory: newCategory && {
      name: newCategory.name,
      error:
        newCategory.error &&
        t(`financialEntries.categoryField.errors.${newCategory.error}`),
      failure: newCategory.failure && t(newCategory.failure),
      canCreate: newCategory.canCreate,
      isSaving: newCategory.isSaving,
    },
    onChangeText: picker.changeText,
    onSelect: picker.choose,
    onRetry: form.reloadCategories,
    onStartNewCategory: picker.startNewCategory,
    onChangeNewName: picker.changeNewName,
    onCreate: () => {
      picker.createNewCategory();
    },
  };

  const { errors } = form;
  const fieldErrors = {
    description:
      errors.description &&
      t(`financialEntries.form.errors.description.${errors.description}`),
    amount:
      errors.amount &&
      t(`financialEntries.form.errors.amount.${errors.amount}`),
    date: errors.date && t(`financialEntries.form.errors.date.${errors.date}`),
    categoryId:
      errors.categoryId &&
      t(`financialEntries.form.errors.categoryId.${errors.categoryId}`),
  } satisfies Record<EntryField, string | undefined>;
  const firstFieldError =
    fieldErrors.description ??
    fieldErrors.amount ??
    fieldErrors.date ??
    fieldErrors.categoryId;

  // Recusado, o Salvar só fica desabilitado: o leitor de tela precisa ouvir o
  // motivo, que de outro modo só aparece na dica de cada campo.
  const announceRefusal = useRef(false);
  useEffect(() => {
    if (announceRefusal.current && firstFieldError) {
      announceRefusal.current = false;
      AccessibilityInfo.announceForAccessibility(firstFieldError);
    }
  }, [firstFieldError]);

  // Fechado no meio do envio, o sheet não teria onde mostrar a resposta.
  // Numa edição com alterações, fechar (até pelo fundo ou arrastando) pergunta
  // antes de jogar fora o que a pessoa digitou.
  const closeUnlessSaving = () => {
    if (form.isSaving) {
      return;
    }
    if (form.editedEntry && form.hasChanges) {
      setIsConfirmingDiscard(true);
      return;
    }
    onClose();
  };

  const originKey = form.editedEntry ? originKeyOf(form.editedEntry) : null;
  const natureLabel = t(
    form.draft.nature === 'INCOME'
      ? 'financialEntries.form.nature.income'
      : 'financialEntries.form.nature.expense',
  );
  const lockedLabel = (label: string, value: string) =>
    t('financialEntries.detail.lockedField', { label, value });
  const locked: LockedFieldsState | null =
    originKey && form.lockedFields.length > 0
      ? {
          fields: form.lockedFields,
          hint: t(`financialEntries.detail.lockedHint.${originKey}`),
          accessibilityLabels: {
            nature: lockedLabel(
              t('financialEntries.form.nature.label'),
              natureLabel,
            ),
            amount: lockedLabel(
              t('financialEntries.form.amount.label'),
              form.draft.amount,
            ),
            date: lockedLabel(
              t('financialEntries.form.date.label'),
              form.draft.date,
            ),
          },
        }
      : null;

  const editActions: EntryEditActions | null = form.editedEntry
    ? {
        cancel: t('financialEntries.detail.cancel'),
        discard: {
          message: t('financialEntries.detail.discard.message'),
          confirm: t('financialEntries.detail.discard.confirm'),
          keep: t('financialEntries.detail.discard.keep'),
        },
        isConfirmingDiscard,
        onCancel: closeUnlessSaving,
        onDiscard: onClose,
        onKeepEditing: () => setIsConfirmingDiscard(false),
      }
    : null;

  const save = async () => {
    announceRefusal.current = !isEntryDraftValid(
      validateEntryDraft(form.draft),
    );
    const saved = await form.submit();
    if (saved) {
      onSaved(saved);
    }
  };

  return (
    <NewEntrySheet
      visible={visible}
      texts={{
        title: t(
          entry
            ? 'financialEntries.detail.editTitle'
            : 'financialEntries.form.title',
        ),
        close: t('financialEntries.form.close'),
        save: t('financialEntries.form.save'),
        saving: t('financialEntries.form.saving'),
        fields: {
          nature: {
            label: t('financialEntries.form.nature.label'),
            income: t('financialEntries.form.nature.income'),
            expense: t('financialEntries.form.nature.expense'),
          },
          description: {
            label: t('financialEntries.form.description.label'),
            placeholder: t('financialEntries.form.description.placeholder'),
          },
          amount: {
            label: t('financialEntries.form.amount.label'),
            placeholder: t('financialEntries.form.amount.placeholder'),
          },
          date: {
            label: t('financialEntries.form.date.label'),
            placeholder: t('financialEntries.form.date.placeholder'),
          },
          category: {
            label: t('financialEntries.form.category.label'),
            placeholder: t('financialEntries.categoryField.placeholder'),
            loading: t('financialEntries.form.category.loading'),
            retry: t('financialEntries.form.category.retry'),
            noResults: t('financialEntries.categoryField.noResults'),
            created: t('financialEntries.categoryField.created'),
            add: t('financialEntries.categoryField.add'),
            newPlaceholder: t('financialEntries.categoryField.newPlaceholder'),
            create: t('financialEntries.categoryField.create'),
          },
          scope: {
            label: t('financialEntries.form.scope.label'),
            professional: t('financialEntries.form.scope.professional'),
            personal: t('financialEntries.form.scope.personal'),
            hint: t('financialEntries.form.scope.hint'),
          },
        },
      }}
      draft={form.draft}
      fieldErrors={fieldErrors}
      category={category}
      failureMessage={form.failure ? t(form.failure) : null}
      isSaving={form.isSaving}
      canSubmit={form.canSubmit}
      locked={locked}
      editActions={editActions}
      onChangeNature={form.setNature}
      onChangeField={form.setField}
      onChangeScope={form.setScope}
      onSubmit={save}
      onClose={closeUnlessSaving}
      onClosed={onClosed}
    />
  );
}
