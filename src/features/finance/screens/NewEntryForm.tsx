import { useEffect, useMemo } from 'react';

import { useTranslation } from 'shared/i18n';

import type { CategoryFieldState } from '../components/CategoryField';
import { NewEntrySheet } from '../components/NewEntrySheet';
import type { EntryField } from '../domain/entryForm';
import {
  defaultCategoryKey,
  type LabeledCategory,
} from '../domain/financialCategory';
import type { FinancialEntry } from '../domain/financialEntry';
import { useCategoryPicker } from '../hooks/useCategoryPicker';
import { useNewEntryForm } from '../hooks/useNewEntryForm';

type NewEntryFormProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: (entry: FinancialEntry) => void;
};

export function NewEntryForm({ visible, onClose, onSaved }: NewEntryFormProps) {
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
  const { startNewEntry } = form;
  const { reset: resetPicker } = picker;

  useEffect(() => {
    if (visible) {
      startNewEntry();
      resetPicker();
    }
  }, [visible, startNewEntry, resetPicker]);

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

  // Fechado no meio do envio, o sheet não teria onde mostrar a resposta.
  const closeUnlessSaving = () => {
    if (!form.isSaving) {
      onClose();
    }
  };

  const save = async () => {
    const entry = await form.submit();
    if (entry) {
      onSaved(entry);
    }
  };

  return (
    <NewEntrySheet
      visible={visible}
      texts={{
        title: t('financialEntries.form.title'),
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
      onChangeNature={form.setNature}
      onChangeField={form.setField}
      onChangeScope={form.setScope}
      onSubmit={save}
      onClose={closeUnlessSaving}
    />
  );
}
