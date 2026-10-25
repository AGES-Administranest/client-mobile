import {
  formatMonthLabel,
  monthOf,
  relativeMonth,
  shiftMonth,
} from './monthPeriod';

const TODAY = new Date(2026, 9, 19, 17, 42);

test('takes the month and the year of a date', () => {
  expect(monthOf(TODAY)).toEqual({ month: 10, year: 2026 });
});

it.each([
  [{ month: 10, year: 2026 }, -1, { month: 9, year: 2026 }],
  [{ month: 10, year: 2026 }, 1, { month: 11, year: 2026 }],
  [{ month: 1, year: 2026 }, -1, { month: 12, year: 2025 }],
  [{ month: 12, year: 2026 }, 1, { month: 1, year: 2027 }],
  [{ month: 3, year: 2026 }, -14, { month: 1, year: 2025 }],
])('shifts %o by %i months to %o', (period, offset, expected) => {
  expect(shiftMonth(period, offset)).toEqual(expected);
});

it.each([
  [{ month: 10, year: 2026 }, 'current'],
  [{ month: 9, year: 2026 }, 'previous'],
  [{ month: 11, year: 2026 }, 'next'],
  [{ month: 8, year: 2026 }, null],
  [{ month: 10, year: 2025 }, null],
])('names %o relative to today as %s', (period, expected) => {
  expect(relativeMonth(period, TODAY)).toBe(expected);
});

it.each([
  [{ month: 12, year: 2025 }, new Date(2026, 0, 15), 'previous'],
  [{ month: 1, year: 2027 }, new Date(2026, 11, 15), 'next'],
])('crosses the year: %o next to %s is %s', (period, today, expected) => {
  expect(relativeMonth(period, today)).toBe(expected);
});

it.each([
  [{ month: 10, year: 2026 }, 'pt-BR', 'Outubro 2026'],
  [{ month: 3, year: 2027 }, 'pt-BR', 'Março 2027'],
  [{ month: 10, year: 2026 }, 'en-US', 'October 2026'],
])('formats %o in %s as %s', (period, locale, expected) => {
  expect(formatMonthLabel(period, locale)).toBe(expected);
});
