import {
  formatAppointmentAmount,
  formatShortDate,
  toAsaBadgeValue,
} from './formatProcedure';

const NBSP = ' ';

describe('formatAppointmentAmount', () => {
  it.each([
    ['350.00', `R$${NBSP}350,00`],
    ['1234.5', `R$${NBSP}1.234,50`],
    ['0.00', `R$${NBSP}0,00`],
    ['19.90', `R$${NBSP}19,90`],
  ])('%j em pt-BR → %j', (amount, expected) => {
    expect(formatAppointmentAmount(amount, 'pt-BR')).toBe(expected);
  });

  it('segue o locale', () => {
    expect(formatAppointmentAmount('1234.50', 'en-US')).toBe('R$1,234.50');
  });

  it.each([[null], ['abc'], [''], ['  ']])(
    'devolve vazio para valor ausente ou inválido (%j)',
    amount => {
      expect(formatAppointmentAmount(amount, 'pt-BR')).toBe('');
    },
  );
});

describe('formatShortDate', () => {
  it.each([
    [new Date(2026, 7, 17, 9, 5), '17 ago'],
    [new Date(2026, 8, 7, 9, 5), '7 set'],
    [new Date(2026, 0, 1, 0, 0), '1 jan'],
    [new Date(2026, 11, 31, 23, 59), '31 dez'],
  ])(
    '%s em pt-BR → %j, sem ano, sem hora e sem ponto',
    (startsAt, expected) => {
      expect(formatShortDate(startsAt.toISOString(), 'pt-BR')).toBe(expected);
    },
  );

  it('usa o dia local, não o UTC, perto da meia-noite', () => {
    expect(
      formatShortDate(new Date(2026, 7, 17, 23, 30).toISOString(), 'pt-BR'),
    ).toBe('17 ago');
  });

  it('segue a ordem do locale', () => {
    expect(
      formatShortDate(new Date(2026, 7, 17, 9, 0).toISOString(), 'en-US'),
    ).toBe('Aug 17');
  });
});

describe('toAsaBadgeValue', () => {
  it.each([
    ['I', 'I'],
    ['IV', 'IV'],
    ['ASA II', 'II'],
    ['asa iii', 'iii'],
    ['  ASA   I  ', 'I'],
    ['ASAII', 'ASAII'],
    ['ASA', null],
    ['', null],
    ['   ', null],
    [null, null],
  ])('asa %j → %j', (asa, expected) => {
    expect(toAsaBadgeValue(asa)).toBe(expected);
  });
});
