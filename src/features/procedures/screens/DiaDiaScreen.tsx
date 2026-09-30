import { useState } from 'react';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { ConflictAlertSheet } from 'features/appointments';
import { useAuth } from 'features/auth';
import {
  formatSupplyPrice,
  SupplySelectorSheet,
  useSupplySelector,
} from 'features/stock';
import { useTranslation } from 'shared/i18n';

import { ProcedureFormSheet } from '../components/ProcedureFormSheet';
import { useConflictAlert } from '../hooks/useConflictAlert';
import { useProcedureForm } from '../hooks/useProcedureForm';
import { useProcedureFormTexts } from '../hooks/useProcedureFormTexts';
import { registerAppointmentSupplies } from '../services/appointmentSupplyService';

type DiaDiaScreenProps = {
  visible: boolean;
  onClose: (created?: { startsAt: string }) => void;
};

export function DiaDiaScreen({ visible, onClose }: DiaDiaScreenProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const {
    values,
    errors,
    submitting,
    submitFailed,
    client,
    supplyPrompt,
    conflict,
    dismissConflict,
    setField,
    setTextField,
    submit,
    acceptSupplyPrompt,
    finishSupplyPrompt,
  } = useProcedureForm(onClose, visible);
  const supplySelector = useSupplySelector();

  function closeSupplySelector(): void {
    supplySelector.reset();
    finishSupplyPrompt();
  }

  const [savingSupply, setSavingSupply] = useState(false);

  // Uma falha mantém o seletor aberto com a escolha feita, para tentar de
  // novo; os insumos também podem ser lançados depois, no detalhe.
  async function confirmSupply(): Promise<void> {
    const selection = supplySelector.submit();
    if (!selection || !session || !supplyPrompt) {
      return;
    }
    setSavingSupply(true);
    try {
      await registerAppointmentSupplies(
        session.idToken,
        supplyPrompt.appointmentId,
        [{ itemId: selection.itemId, quantity: selection.quantity }],
      );
      closeSupplySelector();
    } catch {
      // segue aberto
    } finally {
      setSavingSupply(false);
    }
  }

  const texts = useProcedureFormTexts(errors);
  const conflictAlert = useConflictAlert(conflict);

  return (
    <>
      <ProcedureFormSheet
        // Um Modal sobre outro não abre no iOS: o formulário sai de cena
        // enquanto a pergunta ou o alerta de conflito estão abertos.
        visible={visible && supplyPrompt === null && conflict === null}
        values={values}
        submitting={submitting}
        submitFailed={submitFailed}
        submitErrorText={t('procedures.form.submitError')}
        texts={texts}
        client={client}
        onChangeText={setTextField}
        onChangeClientTerm={client.onTermChange}
        onSelectClient={client.onSelect}
        onChangeSpecies={value => setField('species', value)}
        onChangeAsa={value => setField('asaClassification', value)}
        onSubmit={submit}
        // O ItemModal passa o evento do toque; fechar sem criar não leva dado.
        onClose={() => onClose()}
      />
      <ConflictAlertSheet
        visible={visible && conflictAlert.visible}
        conflictingAppointment={conflictAlert.conflictingAppointment}
        onAdjust={dismissConflict}
      />
      <ConfirmSheet
        visible={supplyPrompt?.step === 'confirm'}
        title={t('procedures.supplyPrompt.title')}
        confirmLabel={t('procedures.supplyPrompt.confirm')}
        cancelLabel={t('procedures.supplyPrompt.cancel')}
        onConfirm={acceptSupplyPrompt}
        onCancel={finishSupplyPrompt}
        cancelAppearance="button"
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
        canSubmit={supplySelector.canSubmit && !savingSupply}
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
        insufficientStockMessage={t('stock.supplySelector.insufficientStock')}
        formatPrice={option => formatSupplyPrice(option.price)}
      />
    </>
  );
}
