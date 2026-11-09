import { useTranslation, type TranslationKey } from 'shared/i18n';

import type { ClinicFieldTexts } from '../components/ClinicFields';
import {
  CLINIC_FIELDS,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';

export function useClinicFormTexts() {
  const { t } = useTranslation();

  const fieldTexts = Object.fromEntries(
    CLINIC_FIELDS.map(field => [
      field,
      {
        label: t(`clinics.newClinic.fields.${field}.label`),
        placeholder: t(`clinics.newClinic.fields.${field}.placeholder`),
      },
    ]),
  ) as Record<ClinicField, ClinicFieldTexts>;

  const toFieldErrors = (errors: ClinicDraftErrors) =>
    Object.fromEntries(
      Object.entries(errors).map(([field, code]) => [
        field,
        t(`clinics.newClinic.errors.${field}.${code}` as TranslationKey),
      ]),
    ) as Partial<Record<ClinicField, string>>;

  return { fieldTexts, toFieldErrors };
}
