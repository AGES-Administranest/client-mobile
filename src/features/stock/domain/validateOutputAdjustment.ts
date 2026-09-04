export type AdjustmentReason = 'loss' | 'expiration' | 'breakage';

export interface OutputAdjustmentData {
    itemId: string;
    quantity: number;
    reason: AdjustmentReason | null;
}

export interface OutputAdjustmentErrors {
  itemId?: string;
  quantity?: string;
  reason?: string;
}

export function validateOutputAdjustment(data: OutputAdjustmentData): OutputAdjustmentErrors {
  const errors: OutputAdjustmentErrors = {};

  if (!data.itemId) {
    errors.itemId = 'required';
  }

  if (data.quantity <= 0 || data.quantity === undefined) {
    errors.quantity = 'required';
  }

  if (!data.reason) {
    errors.reason = "required";
   }
  return errors;
}

export function isAdjustmentValid(errors: OutputAdjustmentErrors): boolean {
    return Object.keys(errors).length === 0;
}