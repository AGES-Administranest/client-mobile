import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Input } from 'app/components/ui/input';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import type { TranslationKey } from 'shared/i18n/dictionary';

import { AdjustmentReasonSelector } from './AdjustmentReasonSelector';
import type { AdjustmentErrorCode } from '../domain/validateOutputAdjustment';
import { useOutputAdjustmentForm } from '../hooks/useOutputAdjustmentForm';

const ERROR_MESSAGE_KEYS: Record<AdjustmentErrorCode, TranslationKey> = {
  required: 'stock.outputAdjustment.errors.required',
  mustBePositive: 'stock.outputAdjustment.errors.mustBePositive',
};

function OutputAdjustmentForm() {
  const { t } = useTranslation();
  const {
    itemId,
    quantity,
    reason,
    errors,
    setItemId,
    setQuantity,
    setReason,
    handleSubmit,
  } = useOutputAdjustmentForm();

  return (
    <View>
      <Input
        placeholder={t('stock.outputAdjustment.itemLabel')}
        value={itemId}
        onChangeText={setItemId}
      />
      {errors.itemId && <Text>{t(ERROR_MESSAGE_KEYS[errors.itemId])}</Text>}

      <Input
        placeholder={t('stock.outputAdjustment.quantityLabel')}
        value={quantity}
        onChangeText={setQuantity}
      />
      {errors.quantity && <Text>{t(ERROR_MESSAGE_KEYS[errors.quantity])}</Text>}

      <AdjustmentReasonSelector value={reason} onSelect={setReason} />
      {errors.reason && <Text>{t(ERROR_MESSAGE_KEYS[errors.reason])}</Text>}

      <Button onPress={handleSubmit}>
        <Text>{t('stock.outputAdjustment.save')}</Text>
      </Button>
    </View>
  );
}

export { OutputAdjustmentForm };
