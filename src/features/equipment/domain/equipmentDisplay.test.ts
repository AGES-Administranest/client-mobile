import { clampPercent, formatMonthYear } from './equipmentDisplay';

describe('clampPercent', () => {
  it.each([
    [0, 0],
    [46, 46],
    [100, 100],
    [100.5, 100],
    [250, 100],
    [-1, 0],
    [-40, 0],
    [NaN, 0],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampPercent(input)).toBe(expected);
  });
});

describe('formatMonthYear', () => {
  it.each([
    ['2022-03-01', 'pt-BR', 'Mar 2022'],
    ['2022-03-31', 'pt-BR', 'Mar 2022'],
    ['2021-01-01', 'pt-BR', 'Jan 2021'],
    ['2026-12-31T23:59:59.000Z', 'pt-BR', 'Dez 2026'],
    ['2022-03-01T00:00:00.000Z', 'pt-BR', 'Mar 2022'],
    ['2022-01-01T00:00:00.000Z', 'pt-BR', 'Jan 2022'],
    ['2022-03-01', 'en-US', 'Mar 2022'],
  ])('formats %s in %s as %s', (date, locale, expected) => {
    expect(formatMonthYear(date, locale)).toBe(expected);
  });

  it('returns an empty string for an unparseable date', () => {
    expect(formatMonthYear('', 'pt-BR')).toBe('');
  });
});
