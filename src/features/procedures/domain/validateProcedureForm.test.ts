import { validateProcedureForm } from './validateProcedureForm';
import { validProcedureForm as valid } from './validProcedureForm.fixture';

describe('validateProcedureForm', () => {
  it('não retorna erros para um formulário válido', () => {
    expect(validateProcedureForm(valid)).toEqual({});
  });

  it('exige paciente, procedimento, local, valor, data e hora de início quando vazios', () => {
    const errors = validateProcedureForm({
      ...valid,
      patientName: '   ',
      procedureName: '',
      location: '  ',
      amount: '  ',
      date: '',
      startTime: '',
    });
    expect(errors.patientName).toBe('REQUIRED');
    expect(errors.procedureName).toBe('REQUIRED');
    expect(errors.location).toBe('REQUIRED');
    expect(errors.amount).toBe('REQUIRED');
    expect(errors.date).toBe('REQUIRED');
    expect(errors.startTime).toBe('REQUIRED');
  });

  it('aceita campos opcionais vazios', () => {
    expect(
      validateProcedureForm({
        ...valid,
        weightKg: '  ',
        patientAgeYears: '  ',
        endTime: '',
      }),
    ).toEqual({});
  });

  it.each([
    ['31/02/2026', 'INVALID_DATE'],
    ['00/01/2026', 'INVALID_DATE'],
    ['01/13/2026', 'INVALID_DATE'],
    ['01/01/26', 'INVALID_DATE'],
    ['31/2/2026', 'INVALID_DATE'],
    ['not-a-date', 'INVALID_DATE'],
  ])('rejeita data inválida "%s"', (date, expected) => {
    expect(validateProcedureForm({ ...valid, date }).date).toBe(expected);
  });

  it('aceita datas reais, incluindo ano bissexto', () => {
    expect(
      validateProcedureForm({ ...valid, date: '29/02/2028' }).date,
    ).toBeUndefined();
  });

  it.each([
    ['24:00', 'INVALID_TIME'],
    ['23:60', 'INVALID_TIME'],
    ['9:00', 'INVALID_TIME'],
    ['not-a-time', 'INVALID_TIME'],
  ])('rejeita hora de início inválida "%s"', (startTime, expected) => {
    expect(validateProcedureForm({ ...valid, startTime }).startTime).toBe(
      expected,
    );
  });

  it('aceita horas limite válidas', () => {
    expect(
      validateProcedureForm({ ...valid, startTime: '00:00', endTime: '23:59' })
        .startTime,
    ).toBeUndefined();
  });

  it('peso não numérico é inválido', () => {
    expect(validateProcedureForm({ ...valid, weightKg: 'abc' }).weightKg).toBe(
      'INVALID_NUMBER',
    );
  });

  it.each(['-1', '0'])('peso "%s" deve ser maior que zero', weightKg => {
    expect(validateProcedureForm({ ...valid, weightKg }).weightKg).toBe(
      'MUST_BE_POSITIVE',
    );
  });

  it('idade decimal não é permitida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '2,5' })
        .patientAgeYears,
    ).toBe('MUST_BE_INTEGER');
  });

  it('idade 0 é válida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '0' }).patientAgeYears,
    ).toBeUndefined();
  });

  it.each(['12,5', '0,5'])('peso com vírgula "%s" é válido', weightKg => {
    expect(
      validateProcedureForm({ ...valid, weightKg }).weightKg,
    ).toBeUndefined();
  });

  it('valor "0,5" é válido e "0,00" deve ser maior que zero', () => {
    expect(
      validateProcedureForm({ ...valid, amount: '0,5' }).amount,
    ).toBeUndefined();
    expect(validateProcedureForm({ ...valid, amount: '0,00' }).amount).toBe(
      'MUST_BE_POSITIVE',
    );
  });

  it('idade não numérica é inválida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: 'abc' })
        .patientAgeYears,
    ).toBe('INVALID_NUMBER');
  });

  it('idade 100 é válida (limite superior)', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '100' })
        .patientAgeYears,
    ).toBeUndefined();
  });

  it('idade acima de 100 é inválida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '101' })
        .patientAgeYears,
    ).toBe('AGE_OUT_OF_RANGE');
  });

  it.each(['-5', '0'])('valor "%s" deve ser maior que zero', amount => {
    expect(validateProcedureForm({ ...valid, amount }).amount).toBe(
      'MUST_BE_POSITIVE',
    );
  });

  it('valor não numérico é inválido', () => {
    expect(validateProcedureForm({ ...valid, amount: 'abc' }).amount).toBe(
      'INVALID_NUMBER',
    );
  });

  it('idade negativa é inválida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '-1' })
        .patientAgeYears,
    ).toBe('AGE_OUT_OF_RANGE');
  });

  it.each([
    ['10:00', '09:00'],
    ['10:00', '10:00'],
  ])(
    'fim "%s"→"%s" (igual ou anterior ao início) é inválido',
    (startTime, endTime) => {
      expect(
        validateProcedureForm({ ...valid, startTime, endTime }).endTime,
      ).toBe('END_BEFORE_START');
    },
  );

  it('rejeita hora de fim com formato inválido', () => {
    expect(validateProcedureForm({ ...valid, endTime: 'abc' }).endTime).toBe(
      'INVALID_TIME',
    );
  });

  it('não valida fim antes do início quando a hora de início já é inválida', () => {
    expect(
      validateProcedureForm({
        ...valid,
        startTime: 'invalid',
        endTime: '09:00',
      }).endTime,
    ).toBeUndefined();
  });
});
