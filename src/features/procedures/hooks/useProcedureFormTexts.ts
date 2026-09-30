import { useTranslation } from 'shared/i18n';

import type { ProcedureFormTexts } from '../components/ProcedureFormSheet';
import {
  ASA_CLASSIFICATIONS,
  type FieldErrorCode,
  type ProcedureErrors,
  type ProcedureFormValues,
} from '../domain/procedure.types';

export function useProcedureFormTexts(
  errors: ProcedureErrors,
  title?: string,
): ProcedureFormTexts {
  const { t } = useTranslation();
  const errorText = (code?: FieldErrorCode): string | undefined =>
    code ? t(`procedures.errors.${code}`) : undefined;

  const resolvedErrors = Object.fromEntries(
    Object.entries(errors).map(([field, code]) => [field, errorText(code)]),
  ) as ProcedureFormTexts['errors'];

  const labels: Record<keyof ProcedureFormValues, string> = {
    patientName: t('procedures.fields.patientName'),
    procedureName: t('procedures.fields.procedureName'),
    clientId: t('procedures.form.location'),
    patientAgeYears: t('procedures.fields.patientAgeYears'),
    weightKg: t('procedures.fields.weightKg'),
    startTime: t('procedures.fields.startTime'),
    endTime: t('procedures.fields.endTime'),
    date: t('procedures.fields.date'),
    notes: t('procedures.fields.notes'),
    amount: t('procedures.fields.amount'),
    species: t('procedures.fields.species'),
    asaClassification: t('procedures.fields.asaClassification'),
  };

  const texts: ProcedureFormTexts = {
    title: title ?? t('procedures.form.title'),
    confirm: t('procedures.form.confirm'),
    close: t('procedures.form.close'),
    labels,
    placeholders: {
      patientName: t('procedures.placeholders.patientName'),
      procedureName: t('procedures.placeholders.procedureName'),
      clientId: t('procedures.placeholders.location'),
      notes: t('procedures.placeholders.notes'),
      patientAgeYears: t('procedures.placeholders.number'),
      weightKg: t('procedures.placeholders.number'),
      startTime: t('procedures.placeholders.time'),
      endTime: t('procedures.placeholders.time'),
      date: t('procedures.placeholders.date'),
      amount: t('procedures.placeholders.number'),
      species: t('procedures.placeholders.species'),
    },
    speciesOptions: [
      { value: 'CANINE', label: t('procedures.species.canine') },
      { value: 'FELINE', label: t('procedures.species.feline') },
      { value: 'EQUINE', label: t('procedures.species.equine') },
      { value: 'BOVINE', label: t('procedures.species.bovine') },
      { value: 'AVIAN', label: t('procedures.species.avian') },
      { value: 'EXOTIC', label: t('procedures.species.exotic') },
      { value: 'OTHER', label: t('procedures.species.other') },
    ],
    asaOptions: [...ASA_CLASSIFICATIONS],
    errors: resolvedErrors,
    clientSearchMessages: {
      loading: t('procedures.clientSearch.loading'),
      error: t('procedures.clientSearch.error'),
      empty: t('procedures.clientSearch.empty'),
    },
  };

  return texts;
}
