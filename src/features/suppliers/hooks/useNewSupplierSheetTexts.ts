import { useTranslation, type TranslationKey } from 'shared/i18n';

import type { SupplierFieldTexts } from '../components/SupplierFields';
import {
  SUPPLIER_FIELDS,
  type SupplierDraftErrors,
  type SupplierField,
} from '../domain/supplierForm';

/** Everything `NewSupplierSheet` shows, translated, for the form it is bound to. */
export function useNewSupplierSheetTexts(errors: SupplierDraftErrors) {
  const { t } = useTranslation();

  const fieldTexts = Object.fromEntries(
    SUPPLIER_FIELDS.map(field => [
      field,
      {
        label: t(`suppliers.fields.${field}.label`),
        placeholder: t(`suppliers.fields.${field}.placeholder`),
      },
    ]),
  ) as Record<SupplierField, SupplierFieldTexts>;

  const fieldErrors = Object.fromEntries(
    Object.entries(errors).map(([field, code]) => [
      field,
      t(`suppliers.errors.${field}.${code}` as TranslationKey),
    ]),
  ) as Partial<Record<SupplierField, string>>;

  return {
    title: t('suppliers.newTitle'),
    fieldTexts,
    fieldErrors,
    confirmLabel: t('suppliers.confirm'),
    closeLabel: t('suppliers.close'),
  };
}
