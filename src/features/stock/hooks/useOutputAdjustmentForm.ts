import { useState } from 'react';

import {
  validateOutputAdjustment,
  isAdjustmentValid,
  type AdjustmentReason,
  type OutputAdjustmentErrors,
} from '../domain/validateOutputAdjustment';

export function useOutputAdjustmentForm() {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<AdjustmentReason | null>(null);
  const [errors, setErrors] = useState<OutputAdjustmentErrors>({});

  function handleSubmit() {
    const data = {
      itemId: itemId,
      quantity: Number(quantity),
      reason: reason,
    };

    const validationErrors = validateOutputAdjustment(data);
    setErrors(validationErrors);

    if (isAdjustmentValid(validationErrors)) {
      //aqui vai chamar o service quando existir o backend
      console.log(data);
    }
  }

  return {
    itemId,
    quantity,
    reason,
    setItemId,
    setQuantity,
    setReason,
    errors,
    handleSubmit,
  };
}
