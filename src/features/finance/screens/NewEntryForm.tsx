import { useEffect } from 'react';

import { useTranslation, type TranslationKey } from 'shared/i18n';

import type { CategoriesState } from '../components/EntryFormFields';
import { NewEntrySheet } from '../components/NewEntrySheet';
import type { EntryField } from '../domain/entryForm';
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
  const { reset } = form;

  // Cada abertura é um lançamento novo: data de hoje, campos vazios e outro id.
  useEffect(() => {
    if (visible) {
      reset();
    }
  }, [visible, reset]);

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

  const fieldErrors = Object.fromEntries(
    Object.entries(form.errors).map(([field, code]) => [
      field,
      t(`financialEntries.form.errors.${field}.${code}` as TranslationKey),
    ]),
  ) as Partial<Record<EntryField, string>>;

  const selectCategory = (categoryId: string) => {
    const category = form.categories.find(c => c.id === categoryId);
    if (category) {
      form.chooseCategory(category);
    }
  };

  // Fechar no meio do envio deixaria a resposta cair num formulário fechado
  // (ou reaberto, já com outro lançamento): o sheet espera o envio terminar.
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
