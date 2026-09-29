import { validateProcedureForm } from './validateProcedureForm';
import { validProcedureForm as valid } from './validProcedureForm.fixture';

describe('validateProcedureForm', () => {
  it('não retorna erros para um formulário válido', () => {
    expect(validateProcedureForm(valid)).toEqual({});
  });

  it('exige paciente, procedimento, tomador, valor, data e hora de início quando vazios', () => {
    const errors = validateProcedureForm({
      ...valid,
      patientName: '   ',
      procedureName: '',
      clientId: null,
      amount: '  ',
      date: '',
      startTime: '',
    });
    expect(errors.patientName).toBe('REQUIRED');
    expect(errors.procedureName).toBe('REQUIRED');
    expect(errors.clientId).toBe('REQUIRED');
    expect(errors.amount).toBe('REQUIRED');
    expect(errors.date).toBe('REQUIRED');
    expect(errors.startTime).toBe('REQUIRED');
  });

  // Os limites abaixo são os do CreateAppointmentDto do backend: passar daqui
  // o front deixava ir e o POST voltava 400.
  it('exige procedimento com pelo menos 2 caracteres', () => {
    expect(
      validateProcedureForm({ ...valid, procedureName: ' a ' }).procedureName,
    ).toBe('TOO_SHORT');
    expect(
      validateProcedureForm({ ...valid, procedureName: 'OS' }).procedureName,
    ).toBeUndefined();
  });

  it.each([
    ['620,555', 'MAX_2_DECIMALS'],
    ['620.555', 'MAX_2_DECIMALS'],
    ['620,55', undefined],
  ])('valor %s -> %s', (amount, expected) => {
    expect(validateProcedureForm({ ...valid, amount }).amount).toBe(expected);
  });

  it.each([
    ['4,2555', 'MAX_3_DECIMALS'],
    ['4,255', undefined],
  ])('peso %s -> %s', (weightKg, expected) => {
    expect(validateProcedureForm({ ...valid, weightKg }).weightKg).toBe(
      expected,
    );
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

describe('validateProcedureForm — agendamento (começo no futuro)', () => {
  // O fixture é 06/08/2026 das 09:00 às 10:00.
  const BEFORE_START = new Date(2026, 7, 6, 8, 0, 0, 0);
  const AFTER_START = new Date(2026, 7, 6, 12, 0, 0, 0);

  it('exige o fim quando o começo é futuro, para haver duração e checagem de conflito', () => {
    expect(
      validateProcedureForm({ ...valid, endTime: '' }, BEFORE_START).endTime,
    ).toBe('REQUIRED_FOR_SCHEDULE');
  });

  it('aceita agendamento futuro com fim informado', () => {
    expect(validateProcedureForm(valid, BEFORE_START)).toEqual({});
  });

  it('continua aceitando procedimento já realizado sem fim', () => {
    expect(
      validateProcedureForm({ ...valid, endTime: '' }, AFTER_START).endTime,
    ).toBeUndefined();
  });

  it('não sobrepõe o erro de data ou hora inválida com o do fim', () => {
    const errors = validateProcedureForm(
      { ...valid, date: '31/02/2026', endTime: '' },
      BEFORE_START,
    );
    expect(errors.date).toBe('INVALID_DATE');
    expect(errors.endTime).toBeUndefined();
  });
});
