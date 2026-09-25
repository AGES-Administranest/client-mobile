import type { Appointment } from './appointment';
import { toCalendarEventInput } from './calendarEvent';

const BASE_APPOINTMENT: Appointment = {
  id: 'appointment-1',
  procedureName: 'Ovariohisterectomia - Mel',
  startsAt: '2026-10-02T14:00:00',
  endsAt: '2026-10-02T15:30:00',
  client: { name: 'Ana Beatriz Souza' },
  notes: 'Paciente em jejum desde as 20h do dia anterior.',
};

it.each<[string, Appointment['notes']]>([
  ['undefined', undefined],
  ['null', null],
  ['empty string', ''],
  ['only whitespace', '   '],
])('drops notes when they are %s', (_label, notes) => {
  const input = toCalendarEventInput({ ...BASE_APPOINTMENT, notes });

  expect(input.notes).toBeUndefined();
});

test('keeps trimmed notes when they have content', () => {
  const input = toCalendarEventInput({
    ...BASE_APPOINTMENT,
    notes: '  Levar guia de anestesia.  ',
  });

  expect(input.notes).toBe('Levar guia de anestesia.');
});

test('maps procedure name, client name and dates to the event fields', () => {
  const input = toCalendarEventInput(BASE_APPOINTMENT);

  expect(input.title).toBe(BASE_APPOINTMENT.procedureName);
  expect(input.location).toBe(BASE_APPOINTMENT.client.name);
  expect(input.startDate).toEqual(new Date(BASE_APPOINTMENT.startsAt));
  expect(input.endDate).toEqual(new Date(BASE_APPOINTMENT.endsAt));
});
