import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useTranslation } from 'shared/i18n';

import type { CategoriesState } from '../components/EntryFormFields';
import { NewEntrySheet } from '../components/NewEntrySheet';
import {
  isEntryDraftValid,
  validateEntryDraft,
  type EntryField,
} from '../domain/entryForm';
import { defaultCategoryKey } from '../domain/financialCategory';
import type {
  FinancialCategory,
  FinancialEntry,
} from '../domain/financialEntry';
import { useNewEntryForm } from '../hooks/useNewEntryForm';

type NewEntryFormProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: (entry: FinancialEntry) => void;
};

export function NewEntryForm({ visible, onClose, onSaved }: NewEntryFormProps) {
  const { t } = useTranslation();
  const form = useNewEntryForm();
  const { startNewEntry } = form;

  useEffect(() => {
    if (visible) {
      startNewEntry();
    }
  }, [visible, startNewEntry]);

  const categoryLabel = (category: FinancialCategory) => {
    const key = defaultCategoryKey(category);
    return key ? t(`financialEntries.categories.${key}`) : category.name;
  };

  const categories: CategoriesState =
    form.categoriesStatus === 'loading'
      ? { status: 'loading' }
      : form.categoriesStatus === 'failed'
      ? {
          status: 'failed',
          message: t(
            form.categoriesFailure ??
              'financialEntries.form.failures.categories',
          ),
        }
      : {
          status: 'ready',
          options: form.categories.map(category => ({
            id: category.id,
            label: categoryLabel(category),
          })),
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

  const selectCategory = (categoryId: string) => {
    const category = form.categories.find(c => c.id === categoryId);
    if (category) {
      form.chooseCategory(category);
    }
  };

  // Fechado no meio do envio, o sheet não teria onde mostrar a resposta.
  const closeUnlessSaving = () => {
    if (!form.isSaving) {
      onClose();
    }
  };

  const save = async () => {
    announceRefusal.current = !isEntryDraftValid(
      validateEntryDraft(form.draft),
    );
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
            loading: t('financialEntries.form.category.loading'),
            retry: t('financialEntries.form.category.retry'),
            empty: t('financialEntries.form.category.empty'),
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
      categories={categories}
      failureMessage={form.failure ? t(form.failure) : null}
      isSaving={form.isSaving}
      canSubmit={form.canSubmit}
      onChangeNature={form.setNature}
      onChangeField={form.setField}
      onSelectCategory={selectCategory}
      onChangeScope={form.setScope}
      onRetryCategories={form.reloadCategories}
      onSubmit={save}
      onClose={closeUnlessSaving}
    />
  );
}
