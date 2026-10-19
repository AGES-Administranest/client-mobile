export type AdjustmentReason = 'loss' | 'expiration' | 'breakage' | 'other';

export const ADJUSTMENT_REASONS: readonly AdjustmentReason[] = [
  'loss',
  'expiration',
  'breakage',
  'other',
];

export type OutputAdjustmentDraft = {
  itemId: string | null;
  quantity: string;
  reason: AdjustmentReason | null;
  otherReason: string;
};

export type AdjustmentErrorCode = 'required' | 'mustBePositive';

export type OutputAdjustmentErrors = {
  itemId?: AdjustmentErrorCode;
  quantity?: AdjustmentErrorCode;
  reason?: AdjustmentErrorCode;
  otherReason?: AdjustmentErrorCode;
};

export const EMPTY_OUTPUT_ADJUSTMENT: OutputAdjustmentDraft = {
  itemId: null,
  quantity: '',
  reason: null,
  otherReason: '',
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseQuantity(value: string): number {
  const digits = digitsOnly(value);

  return digits === '' ? Number.NaN : Number(digits);
}

export function requiresWrittenReason(
  reason: AdjustmentReason | null,
): boolean {
  return reason === 'other';
}

export function validateOutputAdjustment(
  draft: OutputAdjustmentDraft,
): OutputAdjustmentErrors {
  const errors: OutputAdjustmentErrors = {};

  if (!draft.itemId) {
    errors.itemId = 'required';
  }

  const quantity = parseQuantity(draft.quantity);

  if (Number.isNaN(quantity)) {
    errors.quantity = 'required';
  } else if (quantity <= 0) {
    errors.quantity = 'mustBePositive';
  }

  if (!draft.reason) {
    errors.reason = 'required';
  }

  if (requiresWrittenReason(draft.reason) && draft.otherReason.trim() === '') {
    errors.otherReason = 'required';
  }

  return errors;
}

export function isAdjustmentValid(errors: OutputAdjustmentErrors): boolean {
  return Object.keys(errors).length === 0;
}
