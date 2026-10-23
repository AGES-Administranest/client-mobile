import {
  formatOverviewAmount,
  formatPeriodLabel,
  isCurrentPeriod,
  shiftPeriod,
} from './overview';

const normalize = (value: string) => value.replace(/ /g, ' ');

describe('shiftPeriod', () => {
  it.each([
    [8, 2026, -1, 7, 2026],
    [1, 2026, -1, 12, 2025],
    [12, 2026, 1, 1, 2027],
    [8, 2026, 1, 9, 2026],
    [8, 2026, 6, 2, 2027],
  ] as const)(
    '%i/%i shifted by %i is %i/%i',
    (month, year, offset, nextMonth, nextYear) => {
      expect(shiftPeriod({ month, year }, offset)).toEqual({
        month: nextMonth,
        year: nextYear,
      });
    },
  );
});

describe('isCurrentPeriod', () => {
  it.each([
    [{ month: 8, year: 2026 }, '2026-08-01T00:00:00', true],
    [{ month: 8, year: 2026 }, '2026-08-31T23:59:59', true],
    [{ month: 8, year: 2026 }, '2026-09-01T00:00:00', false],
    [{ month: 8, year: 2026 }, '2025-08-20T00:00:00', false],
  ] as const)('%j on %s → %s', (period, date, current) => {
    expect(isCurrentPeriod(period, new Date(date))).toBe(current);
  });
});

describe('formatPeriodLabel', () => {
  it('joins the translated month name and the year', () => {
    expect(formatPeriodLabel({ month: 8, year: 2026 }, 'Agosto')).toBe(
      'Agosto 2026',
    );
  });

  it('uses the name it receives', () => {
    expect(formatPeriodLabel({ month: 1, year: 2025 }, 'January')).toBe(
      'January 2025',
    );
  });
});

describe('formatOverviewAmount', () => {
  it.each([
    [0, 'R$ 0,00'],
    [620, 'R$ 620'],
    [1400, 'R$ 1.400'],
    [10.1, 'R$ 10,10'],
    [189.08, 'R$ 189,08'],
    [0.5, 'R$ 0,50'],
    [-80, '–R$ 80'],
    [-189.08, '–R$ 189,08'],
    [-0.5, '–R$ 0,50'],
  ] as const)('%d reads %s', (value, expected) => {
    expect(normalize(formatOverviewAmount(value, 'pt-BR'))).toBe(expected);
  });

  it('follows the locale', () => {
    expect(normalize(formatOverviewAmount(1400, 'en-US'))).toBe('R$1,400');
    expect(normalize(formatOverviewAmount(-10.5, 'en-US'))).toBe('–R$10.50');
  });
});
