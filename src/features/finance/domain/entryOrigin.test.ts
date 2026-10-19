import {
  lockedFieldsOf,
  openableAppointmentId,
  originKeyOf,
} from './entryOrigin';
import type { EntrySource } from './financialEntry';

it('locks nothing on a manual entry', () => {
  expect(lockedFieldsOf({ source: 'MANUAL' })).toEqual([]);
});

it.each<EntrySource>([
  'APPOINTMENT',
  'SERVICE_INVOICE',
  'PURCHASE_INVOICE',
  'TRIP',
])('locks type, amount and date when the entry came from %s', source => {
  expect(lockedFieldsOf({ source })).toEqual(['nature', 'amount', 'date']);
});

it.each([
  ['MANUAL', null],
  ['APPOINTMENT', 'appointment'],
  ['SERVICE_INVOICE', 'serviceInvoice'],
  ['PURCHASE_INVOICE', 'purchaseInvoice'],
  ['TRIP', 'trip'],
] as const)('names the origin of a %s entry as %s', (source, key) => {
  expect(originKeyOf({ source })).toBe(key);
});

it('opens only appointments, the one origin with a screen in the app', () => {
  expect(
    openableAppointmentId({ origin: { type: 'APPOINTMENT', id: 'apt-1' } }),
  ).toBe('apt-1');
  expect(
    openableAppointmentId({
      origin: { type: 'PURCHASE_INVOICE', id: 'inv-1' },
    }),
  ).toBeNull();
  expect(
    openableAppointmentId({ origin: { type: 'MANUAL', id: null } }),
  ).toBeNull();
});

it('has nothing to open when the appointment link is missing', () => {
  expect(
    openableAppointmentId({ origin: { type: 'APPOINTMENT', id: null } }),
  ).toBeNull();
});
