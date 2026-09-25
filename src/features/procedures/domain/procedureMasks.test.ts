import { applyFieldMask, maskDateInput, maskTimeInput } from './procedureMasks';

describe('maskTimeInput', () => {
  it.each([
    ['', ''],
    ['9', '9'],
    ['09', '09'],
    ['093', '09:3'],
    ['0930', '09:30'],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskTimeInput(input)).toBe(expected);
  });

  it('ignora caracteres não numéricos', () => {
    expect(maskTimeInput('ab09cd30ef')).toBe('09:30');
  });

  it('limita a 5 caracteres (HH:MM)', () => {
    expect(maskTimeInput('0930999')).toBe('09:30');
  });

  it('reformata quando já contém o separador digitado', () => {
    expect(maskTimeInput('09:3')).toBe('09:3');
    expect(maskTimeInput('09:30')).toBe('09:30');
  });
});

describe('maskDateInput', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['06', '06'],
    ['068', '06/8'],
    ['0608', '06/08'],
    ['06082', '06/08/2'],
    ['06082026', '06/08/2026'],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskDateInput(input)).toBe(expected);
  });

  it('ignora caracteres não numéricos', () => {
    expect(maskDateInput('ab06cd08ef2026gh')).toBe('06/08/2026');
  });

  it('limita a 10 caracteres (DD/MM/AAAA)', () => {
    expect(maskDateInput('060820269999')).toBe('06/08/2026');
  });

  it('reformata quando já contém separadores digitados', () => {
    expect(maskDateInput('06/08/2026')).toBe('06/08/2026');
  });
});

describe('applyFieldMask', () => {
  it('aplica a máscara de data ao campo date', () => {
    expect(applyFieldMask('date', '06082026')).toBe('06/08/2026');
  });

  it.each(['startTime', 'endTime'] as const)(
    'aplica a máscara de hora ao campo %s',
    field => {
      expect(applyFieldMask(field, '0930')).toBe('09:30');
    },
  );

  it.each([
    'patientName',
    'procedureName',
    'location',
    'weightKg',
    'patientAgeYears',
    'amount',
    'notes',
  ] as const)('não altera o texto do campo %s', field => {
    expect(applyFieldMask(field, '12,5 abc')).toBe('12,5 abc');
  });
});
