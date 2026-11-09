import { errorsOfStep, stepOfField } from './procedureSteps';

describe('procedure steps', () => {
  it.each([
    ['patientName', 0],
    ['procedureName', 0],
    ['clientId', 0],
    ['date', 0],
    ['startTime', 0],
    ['endTime', 0],
    ['species', 1],
    ['asaClassification', 1],
    ['weightKg', 1],
    ['patientAgeYears', 1],
    ['amount', 1],
    ['notes', 1],
  ] as const)('puts %s on step %i', (field, step) => {
    expect(stepOfField(field)).toBe(step);
  });

  it('keeps only the errors that belong to the step', () => {
    const errors = {
      patientName: 'REQUIRED',
      amount: 'INVALID_NUMBER',
    } as const;

    expect(errorsOfStep(errors, 0)).toEqual({ patientName: 'REQUIRED' });
    expect(errorsOfStep(errors, 1)).toEqual({ amount: 'INVALID_NUMBER' });
  });
});
