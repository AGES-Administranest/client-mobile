import {
  displayDateToIso,
  isoToDisplayDate,
  toDecimalInput,
  toNumber,
} from './tripFormat';

describe('tripFormat', () => {
  it.each([
    ['0.4719', 0.4719],
    [12.5, 12.5],
    ['', 0],
    [null, 0],
    [undefined, 0],
    ['abc', 0],
  ])('reads %p as the number %p', (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  it.each([
    ['32.9', '32,9'],
    [300, '300'],
    [null, ''],
    [undefined, ''],
  ])('shows %p in an input as %p', (input, expected) => {
    expect(toDecimalInput(input)).toBe(expected);
  });

  it.each([
    ['2026-10-24', '24/10/2026'],
    ['24/10', '24/10'],
  ])('shows the date %p as %p', (iso, display) => {
    expect(isoToDisplayDate(iso)).toBe(display);
  });

  it.each([
    ['24/10/2026', '2026-10-24'],
    ['24/10/20', '24/10/20'],
  ])('reads the typed date %p as %p', (display, iso) => {
    expect(displayDateToIso(display)).toBe(iso);
  });
});
