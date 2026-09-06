import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Input } from 'app/components/ui/input';
import { Text } from 'app/components/ui/text';

import { AdjustmentReasonSelector } from './AdjustmentReasonSelector';
import { useOutputAdjustmentForm } from '../hooks/useOutputAdjustmentForm';

function OutputAdjustmentForm() {
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
      <Input value={itemId} onChangeText={setItemId} />
      {errors.itemId && <Text>{errors.itemId}</Text>}
      <Input value={quantity} onChangeText={setQuantity} />
      {errors.quantity && <Text>{errors.quantity}</Text>}
      <AdjustmentReasonSelector value={reason} onSelect={setReason} />
      {errors.reason && <Text>{errors.reason}</Text>}
      <Button onPress={handleSubmit}>
        <Text>Save</Text>
      </Button>
    </View>
  );
}

export { OutputAdjustmentForm };
