import type { Client } from './client';
import { formatClinicLocation } from './clinicLocation';

const clinic = (city: string | null, state: string | null) =>
  ({ city, state } as Client);

it.each([
  ['São Paulo', 'SP', 'São Paulo, SP'],
  ['São Paulo', null, 'São Paulo'],
  [null, 'SP', 'SP'],
  [null, null, ''],
])('formats city %p and state %p as %p', (city, state, expected) => {
  expect(formatClinicLocation(clinic(city, state))).toBe(expected);
});
