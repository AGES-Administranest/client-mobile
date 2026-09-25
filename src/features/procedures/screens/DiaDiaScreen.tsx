import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import {
  formatSupplyPrice,
  SupplySelectorSheet,
  useSupplySelector,
} from 'features/stock';
import { useTranslation } from 'shared/i18n';

import {
  ProcedureFormSheet,
  type ProcedureFormTexts,
} from '../components/ProcedureFormSheet';
import {
  ASA_CLASSIFICATIONS,
  type FieldErrorCode,
  type ProcedureFormValues,
} from '../domain/procedure.types';
import { useProcedureForm } from '../hooks/useProcedureForm';

type DiaDiaScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function DiaDiaScreen({ visible, onClose }: DiaDiaScreenProps) {
  const { t } = useTranslation();
  const {
    values,
    errors,
    submitting,
    submitFailed,
    timeConflict,
    supplyPrompt,
    setField,
    setTextField,
    submit,
    dismissTimeConflict,
    acceptSupplyPrompt,
    finishSupplyPrompt,
  } = useProcedureForm(onClose);
  const supplySelector = useSupplySelector();

  function closeSupplySelector(): void {
    supplySelector.reset();
    finishSupplyPrompt();
  }

  function confirmSupply(): void {
    if (!supplySelector.submit()) {
      return;
    }
    // Ainda não existe endpoint para vincular insumos a um atendimento, então
    // a seleção confirmada não é persistida em lugar nenhum.
    closeSupplySelector();
  }

  const errorText = (code?: FieldErrorCode): string | undefined =>
    code ? t(`procedures.errors.${code}`) : undefined;

  const resolvedErrors = Object.fromEntries(
    Object.entries(errors).map(([field, code]) => [field, errorText(code)]),
  ) as ProcedureFormTexts['errors'];

  const labels: Record<keyof ProcedureFormValues, string> = {
    patientName: t('procedures.fields.patientName'),
    procedureName: t('procedures.fields.procedureName'),
    location: t('procedures.fields.location'),
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
    title: t('procedures.form.title'),
    confirm: t('procedures.form.confirm'),
    labels,
    placeholders: {
      patientName: t('procedures.placeholders.patientName'),
      procedureName: t('procedures.placeholders.procedureName'),
      location: t('procedures.placeholders.location'),
      patientAgeYears: t('procedures.placeholders.number'),
      weightKg: t('procedures.placeholders.number'),
      startTime: t('procedures.placeholders.time'),
      endTime: t('procedures.placeholders.time'),
      date: t('procedures.placeholders.date'),
      amount: t('procedures.placeholders.number'),
    },
    speciesOptions: [
      { value: 'CANINE', label: t('procedures.species.canine') },
      { value: 'FELINE', label: t('procedures.species.feline') },
    ],
    asaOptions: [...ASA_CLASSIFICATIONS],
    errors: resolvedErrors,
  };

  return (
    <>
      <ProcedureFormSheet
        visible={visible && supplyPrompt === null}
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
      <ConfirmSheet
        visible={timeConflict}
        title={t('procedures.conflict.title')}
        message={t('procedures.conflict.message')}
        confirmLabel={t('procedures.conflict.changeInfo')}
        onConfirm={dismissTimeConflict}
        onCancel={dismissTimeConflict}
      />
      <ConfirmSheet
        visible={supplyPrompt?.step === 'confirm'}
        title={t('procedures.supplyPrompt.title')}
        confirmLabel={t('procedures.supplyPrompt.confirm')}
        cancelLabel={t('procedures.supplyPrompt.cancel')}
        onConfirm={acceptSupplyPrompt}
        onCancel={finishSupplyPrompt}
      />
      <SupplySelectorSheet
        visible={supplyPrompt?.step === 'selector'}
        onClose={closeSupplySelector}
        onConfirm={confirmSupply}
        term={supplySelector.term}
        onTermChange={supplySelector.onTermChange}
        options={supplySelector.options}
        isLoading={supplySelector.isLoading}
        hasError={supplySelector.hasError}
        isTermTooShort={supplySelector.isTermTooShort}
        selected={supplySelector.selected}
        onSelect={supplySelector.onSelect}
        quantity={supplySelector.quantity}
        onQuantityChange={supplySelector.onQuantityChange}
        isOverBalance={supplySelector.isOverBalance}
        canSubmit={supplySelector.canSubmit}
        title={t('stock.supplySelector.title')}
        materialLabel={t('stock.supplySelector.materialLabel')}
        searchPlaceholder={t('stock.supplySelector.searchPlaceholder')}
        quantityLabel={t('stock.supplySelector.quantityLabel')}
        confirmLabel={t('stock.supplySelector.confirm')}
        closeLabel={t('stock.supplySelector.close')}
        emptyMessage={t('stock.supplySelector.empty')}
        errorMessage={t('stock.supplySelector.error')}
        loadingMessage={t('stock.supplySelector.loading')}
        termTooShortMessage={t('stock.supplySelector.termTooShort')}
        overBalanceMessage={
          supplySelector.selected
            ? t('stock.supplySelector.overBalance', {
                balance: supplySelector.selected.balance,
                unit: supplySelector.selected.unit,
              })
            : ''
        }
        formatPrice={option => formatSupplyPrice(option.price)}
      />
    </>
  );
}
