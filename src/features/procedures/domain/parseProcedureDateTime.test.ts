import {
  combineDateAndTime,
  isValidCalendarDate,
  isValidTimeOfDay,
  parseMaskedDate,
  parseMaskedTime,
} from './parseProcedureDateTime';

describe('parseMaskedDate', () => {
  it('extrai dia, mês e ano de uma data mascarada', () => {
    expect(parseMaskedDate('06/08/2026')).toEqual({
      day: 6,
      month: 8,
      year: 2026,
    });
  });

  it.each(['06/08/26', '6/8/2026', '', 'invalid'])(
    'retorna null para formato incompleto "%s"',
    value => {
      expect(parseMaskedDate(value)).toBeNull();
    },
  );
});

describe('parseMaskedTime', () => {
  it('extrai horas e minutos de uma hora mascarada', () => {
    expect(parseMaskedTime('09:30')).toEqual({ hours: 9, minutes: 30 });
  });

  it.each(['9:30', '09:3', '', 'invalid'])(
    'retorna null para formato incompleto "%s"',
    value => {
      expect(parseMaskedTime(value)).toBeNull();
    },
  );
});

describe('isValidCalendarDate', () => {
  it.each([
    [6, 8, 2026, true],
    [29, 2, 2028, true], // ano bissexto
    [29, 2, 2026, false], // não é bissexto
    [31, 2, 2026, false],
    [0, 1, 2026, false],
    [1, 0, 2026, false],
    [1, 13, 2026, false],
    [1, 1, 26, false], // ano precisa ter 4 dígitos
  ])('dia=%i mês=%i ano=%i → %s', (day, month, year, expected) => {
    expect(isValidCalendarDate(day, month, year)).toBe(expected);
  });
});

describe('isValidTimeOfDay', () => {
  it.each([
    [0, 0, true],
    [23, 59, true],
    [24, 0, false],
    [23, 60, false],
    [-1, 0, false],
  ])('horas=%i minutos=%i → %s', (hours, minutes, expected) => {
    expect(isValidTimeOfDay(hours, minutes)).toBe(expected);
  });
});

describe('combineDateAndTime', () => {
  it('combina data e hora locais em um único Date', () => {
    const result = combineDateAndTime('06/08/2026', '09:30');
    expect(result).toEqual(new Date(2026, 7, 6, 9, 30, 0, 0));
  });

  it('retorna null quando a data é inválida', () => {
    expect(combineDateAndTime('31/02/2026', '09:30')).toBeNull();
  });

  it('retorna null quando a hora é inválida', () => {
    expect(combineDateAndTime('06/08/2026', '24:00')).toBeNull();
  });
});
