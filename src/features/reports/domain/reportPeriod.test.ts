import {
  defaultReportPeriod,
  formatReportDate,
  isReportPeriodReady,
} from './reportPeriod';

describe('defaultReportPeriod', () => {
  it.each([
    [new Date(2026, 10, 2), '2026-11-01', '2026-11-02'],
    [new Date(2026, 0, 1), '2026-01-01', '2026-01-01'],
    [new Date(2026, 1, 28), '2026-02-01', '2026-02-28'],
  ])('%s starts on the 1st of the month and ends today', (today, from, to) => {
    expect(defaultReportPeriod(today)).toEqual({ from, to });
  });
});

describe('isReportPeriodReady', () => {
  it.each([
    [{ from: '2026-11-01', to: '2026-11-02' }, true],
    [{ from: '2026-11-01', to: '2026-11-01' }, true],
    [{ from: '2026-11-01', to: null }, false],
    [{ from: null, to: null }, false],
  ])('%j -> %s', (range, expected) => {
    expect(isReportPeriodReady(range)).toBe(expected);
  });
});

describe('formatReportDate', () => {
  it('formats as a short date in the locale', () => {
    expect(formatReportDate('2026-11-02', 'pt-BR')).toBe('02/11/2026');
  });
});
