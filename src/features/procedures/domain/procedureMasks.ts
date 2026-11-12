import type { ProcedureTextField } from './procedure.types';

export function maskTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

// Digits and at most one decimal separator (comma or dot, as people type it).
export function maskDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const separator = cleaned.search(/[.,]/);

  if (separator === -1) {
    return cleaned;
  }

  return (
    cleaned.slice(0, separator + 1) +
    cleaned.slice(separator + 1).replace(/[.,]/g, '')
  );
}

const FIELD_MASKS: Partial<
  Record<ProcedureTextField, (value: string) => string>
> = {
  date: maskDateInput,
  startTime: maskTimeInput,
  endTime: maskTimeInput,
  patientAgeYears: maskIntegerInput,
  weightKg: maskDecimalInput,
};

export function applyFieldMask(
  field: ProcedureTextField,
  value: string,
): string {
  const mask = FIELD_MASKS[field];
  return mask ? mask(value) : value;
}
