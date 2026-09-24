import { useTranslation } from 'shared/i18n';

import {
  ProcedureFormSheet,
  type ProcedureFormTexts,
} from '../components/ProcedureFormSheet';
import type {
  FieldErrorCode,
  ProcedureErrors,
  ProcedureFormValues,
} from '../domain/procedure.types';
import { useProcedureForm } from '../hooks/useProcedureForm';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DiaDiaScreen({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const {
    values,
    errors,
    submitting,
    submitFailed,
    setField,
    setTextField,
    submit,
  } = useProcedureForm(onClose);

  const errorText = (code?: FieldErrorCode): string | undefined =>
    code ? t(`procedures.errors.${code}`) : undefined;

  const resolvedErrors = Object.fromEntries(
    Object.entries(errors as ProcedureErrors).map(([field, code]) => [
      field,
      errorText(code),
    ]),
  ) as ProcedureFormTexts['errors'];

  const labels: Record<keyof ProcedureFormValues, string> = {
    patientName: t('procedures.fields.patientName'),
    procedureName: t('procedures.fields.procedureName'),
    location: t('procedures.fields.location'),
    species: t('procedures.fields.species'),
    asaClassification: t('procedures.fields.asaClassification'),
    weightKg: t('procedures.fields.weightKg'),
    patientAgeYears: t('procedures.fields.patientAgeYears'),
    amount: t('procedures.fields.amount'),
    startsAt: t('procedures.fields.startsAt'),
    endsAt: t('procedures.fields.endsAt'),
    notes: t('procedures.fields.notes'),
  };

  const texts: ProcedureFormTexts = {
    title: t('procedures.form.title'),
    confirm: t('procedures.form.confirm'),
    labels,
    placeholders: {
      patientName: t('procedures.placeholders.patientName'),
      procedureName: t('procedures.placeholders.procedureName'),
      location: t('procedures.placeholders.location'),
    },
    speciesOptions: [
      { value: 'CANINE', label: t('procedures.species.canine') },
      { value: 'FELINE', label: t('procedures.species.feline') },
      { value: 'OTHER', label: t('procedures.species.other') },
    ],
    asaOptions: ['I', 'II', 'III', 'IV'],
    errors: resolvedErrors,
  };

  return (
    <ProcedureFormSheet
      visible={visible}
      values={values}
      submitting={submitting}
      submitFailed={submitFailed}
      submitErrorText={t('procedures.form.submitError')}
      texts={texts}
      onChangeText={setTextField}
      onChangeSpecies={value => setField('species', value)}
      onChangeAsa={value => setField('asaClassification', value)}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
