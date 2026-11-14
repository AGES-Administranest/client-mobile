import { formatAcceptanceDate } from './privacy';

it.each([
  ['2026-08-10T15:00:00.000Z', '10/08/2026'],
  ['2026-01-05T15:30:00.000Z', '05/01/2026'],
  ['2026-12-31T12:00:00.000Z', '31/12/2026'],
])('writes %s as %s', (acceptedAt, expected) => {
  expect(formatAcceptanceDate(acceptedAt)).toBe(expected);
});

it.each([[null], [''], ['not a date']])(
  'has no date to show for %p',
  acceptedAt => {
    expect(formatAcceptanceDate(acceptedAt)).toBeNull();
  },
);
