import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

import { OutputAdjustmentModal } from 'app/components/ui/OutputAdjustmentModal';
import { useTranslation } from 'shared/i18n';

import { ADJUSTMENT_REASONS } from '../domain/outputAdjustment';
import { unitPluralFormFor } from '../domain/stockMovement';
import { useStockSyncState } from '../hooks/StockSyncContext';
import { useOutputAdjustment } from '../hooks/useOutputAdjustment';

type OutputAdjustmentSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function OutputAdjustmentSheet({
  visible,
  onClose,
  onSaved,
}: OutputAdjustmentSheetProps) {
  const { t, locale } = useTranslation();
  const { sync } = useStockSyncState();
  const adjustment = useOutputAdjustment();
  const { reset, reloadItems } = adjustment;
  const openedBefore = useRef(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    reset();
    // Fica montado depois da primeira abertura: um item cadastrado desde então
    // só aparece na lista se ela for buscada de novo.
    if (openedBefore.current) {
      reloadItems();
    }
    openedBefore.current = true;
  }, [visible, reset, reloadItems]);

  const reasonLabels = Object.fromEntries(
    ADJUSTMENT_REASONS.map(reason => [
      reason,
      t(`stock.outputAdjustment.reasons.${reason}`),
    ]),
  ) as Record<(typeof ADJUSTMENT_REASONS)[number], string>;

  const errorMessages = {
    required: t('stock.outputAdjustment.errors.required'),
    mustBePositive: t('stock.outputAdjustment.errors.mustBePositive'),
  };

  const failureMessage = adjustment.failure
    ? t(
        `stock.outputAdjustment.errors.${adjustment.failure.code}`,
        adjustment.failure.params,
      )
    : null;

  // Um aviso que aparece não é lido sozinho pelo VoiceOver nem pelo TalkBack.
  useEffect(() => {
    if (failureMessage) {
      AccessibilityInfo.announceForAccessibility(failureMessage);
    }
  }, [failureMessage]);

  const submitAdjustment = async () => {
    const saved = await adjustment.submit();

    if (saved) {
      onSaved();
      sync();
    }
  };

  return (
    <OutputAdjustmentModal
      visible={visible}
      onClose={onClose}
      onSubmit={submitAdjustment}
      draft={adjustment.draft}
      items={adjustment.items}
      errors={adjustment.errors}
      isSaving={adjustment.isSaving}
      needsWrittenReason={adjustment.needsWrittenReason}
      onItemChange={adjustment.setItemId}
      onQuantityChange={adjustment.setQuantity}
      onReasonChange={adjustment.setReason}
      onOtherReasonChange={adjustment.setOtherReason}
      title={t('stock.outputAdjustment.title')}
      itemLabel={t('stock.outputAdjustment.itemLabel')}
      itemPlaceholder={t('stock.outputAdjustment.itemPlaceholder')}
      quantityLabel={t('stock.outputAdjustment.quantityLabel')}
      quantityPlaceholder={t('stock.outputAdjustment.quantityPlaceholder')}
      reasonLabel={t('stock.outputAdjustment.reasonLabel')}
      otherReasonLabel={t('stock.outputAdjustment.otherReasonLabel')}
      otherReasonPlaceholder={t(
        'stock.outputAdjustment.otherReasonPlaceholder',
      )}
      saveLabel={t('stock.outputAdjustment.save')}
      closeLabel={t('stock.outputAdjustment.close')}
      failureMessage={failureMessage}
      reasonLabels={reasonLabels}
      errorMessages={errorMessages}
      itemCaption={item =>
        t('stock.movementHistory.quantity', {
          quantity: item.availableQuantity.toLocaleString(locale, {
            maximumFractionDigits: 3,
          }),
          unit: t(
            `stock.movementHistory.units.${item.unit}.${unitPluralFormFor(
              item.availableQuantity,
            )}`,
          ),
        })
      }
      noItemsMessage={t('stock.outputAdjustment.noItems')}
    />
  );
}
