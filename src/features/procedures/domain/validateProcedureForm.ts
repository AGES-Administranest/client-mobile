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

  return errors;
}
