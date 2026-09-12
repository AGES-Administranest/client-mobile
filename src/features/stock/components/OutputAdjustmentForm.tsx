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
    <View className="gap-4 p-4">
      <View className="gap-1">
        <Text className="text-xs font-medium text-label-tertiary uppercase">
          {t('stock.outputAdjustment.itemLabel')}
        </Text>
        <Input value={itemId} onChangeText={setItemId} />
      </View>
      {errors.itemId && <Text>{t(ERROR_MESSAGE_KEYS[errors.itemId])}</Text>}

      <View className="gap-1">
        <Text className="text-xs font-medium text-label-tertiary uppercase">
          {t('stock.outputAdjustment.quantityLabel')}
        </Text>
        <Input value={quantity} onChangeText={setQuantity} />
      </View>
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
