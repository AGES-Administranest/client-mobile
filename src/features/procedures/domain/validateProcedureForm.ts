import { parseDecimal } from './parseDecimal';
import type { ProcedureErrors, ProcedureFormValues } from './procedure.types';

export function validateProcedureForm(
  values: ProcedureFormValues,
): ProcedureErrors {
  const errors: ProcedureErrors = {};

  if (values.patientName.trim() === '') {
    errors.patientName = 'REQUIRED';
  }
  if (values.procedureName.trim() === '') {
    errors.procedureName = 'REQUIRED';
  }
  if (values.startsAt === null) {
    errors.startsAt = 'REQUIRED';
  }

  if (values.weightKg.trim() !== '') {
    const weight = parseDecimal(values.weightKg);
    if (weight === null) {
      errors.weightKg = 'INVALID_NUMBER';
    } else if (weight < 0) {
      errors.weightKg = 'MUST_BE_NON_NEGATIVE';
    }
  }

  if (values.patientAgeYears.trim() !== '') {
    const age = parseDecimal(values.patientAgeYears);
    if (age === null) {
      errors.patientAgeYears = 'INVALID_NUMBER';
    } else if (!Number.isInteger(age)) {
      errors.patientAgeYears = 'MUST_BE_INTEGER';
    } else if (age < 0 || age > 100) {
      errors.patientAgeYears = 'AGE_OUT_OF_RANGE';
    }
  }

  if (values.amount.trim() !== '') {
    const amount = parseDecimal(values.amount);
    if (amount === null) {
      errors.amount = 'INVALID_NUMBER';
    } else if (amount < 0) {
      errors.amount = 'MUST_BE_NON_NEGATIVE';
    }
  }

  if (
    values.startsAt !== null &&
    values.endsAt !== null &&
    values.endsAt <= values.startsAt
  ) {
    errors.endsAt = 'END_BEFORE_START';
  }

  return errors;
}
