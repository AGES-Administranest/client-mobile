import {
  formatEntryDate,
  maskDateInput,
  parseEntryDate,
  toAccrualDate,
} from './entryDate';

describe('maskDateInput', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['0908', '09/08'],
    ['09082026', '09/08/2026'],
    ['09/08/2026', '09/08/2026'],
    ['0908202612', '09/08/2026'],
  ])('%p -> %p', (typed, masked) => {
    expect(maskDateInput(typed)).toBe(masked);
  });
});

describe('parseEntryDate', () => {
  it.each([
    ['09/08/2026', { day: 9, month: 8, year: 2026 }],
    ['29/02/2028', { day: 29, month: 2, year: 2028 }],
    ['31/12/2026', { day: 31, month: 12, year: 2026 }],
    ['01/01/2000', { day: 1, month: 1, year: 2000 }],
    ['31/12/2100', { day: 31, month: 12, year: 2100 }],
  ])('%p is a real date', (value, parsed) => {
    expect(parseEntryDate(value)).toEqual(parsed);
  });

  it.each([
    '',
    '09/08',
    '31/02/2026',
    '29/02/2027',
    '00/08/2026',
    '10/13/2026',
    '9/8/2026',
    // Fora dos anos que o extrato consulta: um dígito errado no ano.
    '31/12/1999',
    '08/10/1926',
    '01/01/2101',
    '08/10/2206',
  ])('refuses %p', value => {
    expect(parseEntryDate(value)).toBeNull();
  });
});

test('sends the day at noon UTC so it stays in the same month in Brazil', () => {
  expect(toAccrualDate({ day: 1, month: 10, year: 2026 })).toBe(
    '2026-10-01T12:00:00.000Z',
  );
});

test('formats a date for the field', () => {
  expect(formatEntryDate(new Date(2026, 9, 8))).toBe('08/10/2026');
});
