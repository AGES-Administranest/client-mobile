import type { ProcedureErrors, ProcedureFormValues } from './procedure.types';

export type ProcedureStep = 0 | 1;

export const LAST_PROCEDURE_STEP: ProcedureStep = 1;

// The first step holds everything that is required to schedule; the second,
// what only describes the patient and the money, which can stay empty.
const FIRST_STEP_FIELDS: readonly (keyof ProcedureFormValues)[] = [
  'patientName',
  'procedureName',
  'clientId',
  'date',
  'startTime',
  'endTime',
];

export function stepOfField(field: keyof ProcedureFormValues): ProcedureStep {
  return FIRST_STEP_FIELDS.includes(field) ? 0 : 1;
}

export function errorsOfStep(
  errors: ProcedureErrors,
  step: ProcedureStep,
): ProcedureErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field]) => stepOfField(field as keyof ProcedureFormValues) === step,
    ),
  ) as ProcedureErrors;
}
