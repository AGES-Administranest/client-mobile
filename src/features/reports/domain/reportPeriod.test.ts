import { reportPeriodFor, reportToday } from './reportPeriod';

// Midday in Sao Paulo (UTC-3), so the calendar day is the same in any zone.
const noon = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 15));

describe('reportPeriodFor currentMonth', () => {
  it.each([
    [noon(2026, 11, 2), '2026-11-01', '2026-11-02'],
    [noon(2026, 11, 1), '2026-11-01', '2026-11-01'],
    [noon(2026, 1, 1), '2026-01-01', '2026-01-01'],
    [noon(2026, 12, 31), '2026-12-01', '2026-12-31'],
    [noon(2028, 2, 29), '2028-02-01', '2028-02-29'],
  ])('%s -> %s to %s', (now, from, to) => {
    expect(reportPeriodFor('currentMonth', now)).toEqual({ from, to });
  });
});

describe('reportPeriodFor previousMonth', () => {
  it.each([
    [
      'in January, December of the previous year',
      noon(2026, 1, 15),
      '2025-12-01',
      '2025-12-31',
    ],
    ['on January 1st', noon(2026, 1, 1), '2025-12-01', '2025-12-31'],
    ['on the 1st of a month', noon(2026, 11, 1), '2026-10-01', '2026-10-31'],
    ['on the 31st of a month', noon(2026, 3, 31), '2026-02-01', '2026-02-28'],
    ['before a leap February', noon(2028, 3, 1), '2028-02-01', '2028-02-29'],
    ['before a common February', noon(2027, 3, 1), '2027-02-01', '2027-02-28'],
    ['a 30-day month', noon(2026, 5, 10), '2026-04-01', '2026-04-30'],
    ['in December', noon(2026, 12, 31), '2026-11-01', '2026-11-30'],
  ])('%s', (_name, now, from, to) => {
    expect(reportPeriodFor('previousMonth', now)).toEqual({ from, to });
  });
});

describe('reportPeriodFor currentYear', () => {
  it.each([
    [noon(2026, 11, 2), '2026-01-01', '2026-11-02'],
    [noon(2026, 1, 1), '2026-01-01', '2026-01-01'],
    [noon(2028, 2, 29), '2028-01-01', '2028-02-29'],
    [noon(2026, 12, 31), '2026-01-01', '2026-12-31'],
  ])('%s -> %s to %s', (now, from, to) => {
    expect(reportPeriodFor('currentYear', now)).toEqual({ from, to });
  });
});

describe('reportPeriodFor in America/Sao_Paulo', () => {
  it.each([
    [
      'currentMonth',
      '2026-03-01T02:00:00Z',
      { from: '2026-02-01', to: '2026-02-28' },
    ],
    [
      'previousMonth',
      '2026-03-01T02:00:00Z',
      { from: '2026-01-01', to: '2026-01-31' },
    ],
    [
      'currentYear',
      '2026-01-01T02:00:00Z',
      { from: '2025-01-01', to: '2025-12-31' },
    ],
    [
      'previousMonth',
      '2026-01-01T02:59:00Z',
      { from: '2025-11-01', to: '2025-11-30' },
    ],
    [
      'currentMonth',
      '2026-02-01T03:00:00Z',
      { from: '2026-02-01', to: '2026-02-01' },
    ],
  ] as const)(
    '%s at %s (UTC) follows the Sao Paulo calendar day',
    (shortcut, instant, expected) => {
      expect(reportPeriodFor(shortcut, new Date(instant))).toEqual(expected);
    },
  );
});

describe('reportToday', () => {
  it.each([
    ['2026-11-04T15:00:00Z', '2026-11-04'],
    ['2026-02-01T01:00:00Z', '2026-01-31'],
    ['2026-01-01T02:59:59Z', '2025-12-31'],
    ['2026-01-01T03:00:00Z', '2026-01-01'],
  ])('%s (UTC) is %s in Sao Paulo', (instant, expected) => {
    expect(reportToday(new Date(instant))).toBe(expected);
  });
});
