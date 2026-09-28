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

const FIELD_MASKS: Partial<
  Record<ProcedureTextField, (value: string) => string>
> = {
  date: maskDateInput,
  startTime: maskTimeInput,
  endTime: maskTimeInput,
};

export function applyFieldMask(
  field: ProcedureTextField,
  value: string,
): string {
  const mask = FIELD_MASKS[field];
  return mask ? mask(value) : value;
}
