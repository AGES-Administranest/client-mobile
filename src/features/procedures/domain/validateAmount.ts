import { parseDecimal } from './parseDecimal';
import type { FieldErrorCode } from './procedure.types';

export type AmountFieldError = Extract<
  FieldErrorCode,
  'REQUIRED' | 'INVALID_NUMBER' | 'MUST_BE_POSITIVE' | 'MAX_2_DECIMALS'
>;

export function validateAmountInput(raw: string): AmountFieldError | null {
  if (raw.trim() === '') {
    return 'REQUIRED';
  }

  const amount = parseDecimal(raw);
  if (amount === null) {
    return 'INVALID_NUMBER';
  }
  if (amount < 0) {
    return 'MUST_BE_POSITIVE';
  }
  if (decimalPlaces(raw) > 2) {
    return 'MAX_2_DECIMALS';
  }
  return null;
}

function decimalPlaces(raw: string): number {
  const [, fraction = ''] = raw.trim().replace(',', '.').split('.');
  return fraction.length;
}
