import { parseDecimal } from './parseDecimal';
import {
  isValidCalendarDate,
  isValidTimeOfDay,
  parseMaskedDate,
  parseMaskedTime,
} from './parseProcedureDateTime';
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
  } else if (values.procedureName.trim().length < 2) {
    errors.procedureName = 'TOO_SHORT';
  }
  if (values.clientId === null) {
    errors.clientId = 'REQUIRED';
  }

  if (values.date.trim() === '') {
    errors.date = 'REQUIRED';
  } else {
    const parsedDate = parseMaskedDate(values.date);
    if (
      !parsedDate ||
      !isValidCalendarDate(parsedDate.day, parsedDate.month, parsedDate.year)
    ) {
      errors.date = 'INVALID_DATE';
    }
  }

  if (values.startTime.trim() === '') {
    errors.startTime = 'REQUIRED';
  } else {
    const parsedStartTime = parseMaskedTime(values.startTime);
    if (
      !parsedStartTime ||
      !isValidTimeOfDay(parsedStartTime.hours, parsedStartTime.minutes)
    ) {
      errors.startTime = 'INVALID_TIME';
    }
  }

  if (values.endTime.trim() !== '') {
    const parsedEndTime = parseMaskedTime(values.endTime);
    if (
      !parsedEndTime ||
      !isValidTimeOfDay(parsedEndTime.hours, parsedEndTime.minutes)
    ) {
      errors.endTime = 'INVALID_TIME';
    } else if (!errors.startTime) {
      const parsedStartTime = parseMaskedTime(values.startTime);
      const startMinutes =
        parsedStartTime!.hours * 60 + parsedStartTime!.minutes;
      const endMinutes = parsedEndTime.hours * 60 + parsedEndTime.minutes;
      if (endMinutes <= startMinutes) {
        errors.endTime = 'END_BEFORE_START';
      }
    }
  }

  if (values.weightKg.trim() !== '') {
    const weight = parseDecimal(values.weightKg);
    if (weight === null) {
      errors.weightKg = 'INVALID_NUMBER';
    } else if (weight <= 0) {
      errors.weightKg = 'MUST_BE_POSITIVE';
    } else if (decimalPlaces(values.weightKg) > 3) {
      errors.weightKg = 'MAX_3_DECIMALS';
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

  if (values.amount.trim() === '') {
    errors.amount = 'REQUIRED';
  } else {
    const amount = parseDecimal(values.amount);
    if (amount === null) {
      errors.amount = 'INVALID_NUMBER';
    } else if (amount <= 0) {
      errors.amount = 'MUST_BE_POSITIVE';
    } else if (decimalPlaces(values.amount) > 2) {
      errors.amount = 'MAX_2_DECIMALS';
    }
  }

  return errors;
}

// Conta no texto digitado (vírgula ou ponto): o número já convertido pode
// trazer resíduo de ponto flutuante.
function decimalPlaces(raw: string): number {
  const [, fraction = ''] = raw.trim().replace(',', '.').split('.');
  return fraction.length;
}
