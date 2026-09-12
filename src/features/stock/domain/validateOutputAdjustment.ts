export type AdjustmentReason = 'loss' | 'expiration' | 'breakage' | 'other';

export type AdjustmentErrorCode = 'required' | 'mustBePositive';

export interface OutputAdjustmentData {
  itemId: string;
  quantity: number;
  reason: AdjustmentReason | null;
}

export interface OutputAdjustmentErrors {
  itemId?: AdjustmentErrorCode;
  quantity?: AdjustmentErrorCode;
  reason?: AdjustmentErrorCode;
}

export function validateOutputAdjustment(
  data: OutputAdjustmentData,
): OutputAdjustmentErrors {
  const errors: OutputAdjustmentErrors = {};

  if (!data.itemId) {
    errors.itemId = 'required';
  }

  if (Number.isNaN(data.quantity)) {
    errors.quantity = 'required';
  } else if (data.quantity <= 0) {
    errors.quantity = 'mustBePositive';
  }

  if (!data.reason) {
    errors.reason = 'required';
  }
  return errors;
}

export function isAdjustmentValid(errors: OutputAdjustmentErrors): boolean {
  return Object.keys(errors).length === 0;
}
