import { useTranslation, type TranslationKey } from 'shared/i18n';

import type { NewClinicFormState } from './useNewClinicForm';
import type { ClinicFieldTexts } from '../components/ClinicFields';
import {
  CLINIC_FIELDS,
  type ClinicDraftErrors,
  type ClinicField,
} from '../domain/clinicForm';

type ClinicErrorKeys = {
  [Field in ClinicField]: Record<
    NonNullable<ClinicDraftErrors[Field]>,
    TranslationKey
  >;
};

const CLINIC_ERROR_KEYS: ClinicErrorKeys = {
  name: {
    required: 'clinics.newClinic.errors.name.required',
    tooShort: 'clinics.newClinic.errors.name.tooShort',
  },
  cnpj: {
    required: 'clinics.newClinic.errors.cnpj.required',
    invalid: 'clinics.newClinic.errors.cnpj.invalid',
    duplicated: 'clinics.newClinic.errors.cnpj.duplicated',
  },
  addressLine: {
    required: 'clinics.newClinic.errors.addressLine.required',
    tooShort: 'clinics.newClinic.errors.addressLine.tooShort',
  },
  city: {
    required: 'clinics.newClinic.errors.city.required',
    tooShort: 'clinics.newClinic.errors.city.tooShort',
    invalid: 'clinics.newClinic.errors.city.invalid',
  },
  state: {
    required: 'clinics.newClinic.errors.state.required',
    invalid: 'clinics.newClinic.errors.state.invalid',
  },
  phone: {
    required: 'clinics.newClinic.errors.phone.required',
    invalid: 'clinics.newClinic.errors.phone.invalid',
  },
  email: {
    required: 'clinics.newClinic.errors.email.required',
    invalid: 'clinics.newClinic.errors.email.invalid',
  },
  contactName: {
    required: 'clinics.newClinic.errors.contactName.required',
    tooShort: 'clinics.newClinic.errors.contactName.tooShort',
    invalid: 'clinics.newClinic.errors.contactName.invalid',
  },
};

type NewClinicSheetTexts = {
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  fieldErrors: Partial<Record<ClinicField, string>>;
  failureMessage: string | null;
  confirmLabel: string;
  savingLabel: string;
  closeLabel: string;
};

/** Everything `NewClinicSheet` shows, translated, for the form it is bound to. */
export function useNewClinicSheetTexts(
  form: Pick<NewClinicFormState, 'errors' | 'failure'>,
): NewClinicSheetTexts {
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

  const fieldErrors: Partial<Record<ClinicField, string>> = {};
  for (const field of CLINIC_FIELDS) {
    const code = (form.errors as ClinicDraftErrors)[field];
    if (!code) continue;
    const keys: Record<string, TranslationKey> = CLINIC_ERROR_KEYS[field];
    fieldErrors[field] = t(keys[code]);
  }

  return {
    fieldTexts,
    fieldErrors,
    failureMessage: form.failure && t(form.failure),
    confirmLabel: t('clinics.newClinic.confirm'),
    savingLabel: t('clinics.newClinic.saving'),
    closeLabel: t('clinics.newClinic.close'),
  };
}
