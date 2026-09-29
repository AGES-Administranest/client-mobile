import {
  toCalendarEventInput,
  type ExportableAppointment,
} from './calendarEvent';

const BASE_APPOINTMENT: ExportableAppointment = {
  procedureName: 'Ovariohisterectomia',
  patientName: 'Mel',
  startsAt: '2026-10-02T14:00:00',
  endsAt: '2026-10-02T15:30:00',
  location: 'Clínica VetNova',
  notes: 'Paciente em jejum desde as 20h do dia anterior.',
};

it.each<[string, ExportableAppointment['notes']]>([
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

test('maps procedure, patient, location and dates to the event fields', () => {
  const input = toCalendarEventInput(BASE_APPOINTMENT);

  expect(input.title).toBe('Ovariohisterectomia - Mel');
  expect(input.location).toBe('Clínica VetNova');
  expect(input.startDate).toEqual(new Date(BASE_APPOINTMENT.startsAt));
  expect(input.endDate).toEqual(new Date(BASE_APPOINTMENT.endsAt!));
});

test('titles the event with whichever of procedure and patient exists', () => {
  expect(
    toCalendarEventInput({ ...BASE_APPOINTMENT, patientName: null }).title,
  ).toBe('Ovariohisterectomia');
  expect(
    toCalendarEventInput({ ...BASE_APPOINTMENT, procedureName: null }).title,
  ).toBe('Mel');
});

test('ends an hour after the start when there is no end time', () => {
  const input = toCalendarEventInput({ ...BASE_APPOINTMENT, endsAt: null });

  expect(input.endDate.getTime() - input.startDate.getTime()).toBe(
    60 * 60 * 1000,
  );
});

test('leaves the location empty when the appointment has none', () => {
  expect(
    toCalendarEventInput({ ...BASE_APPOINTMENT, location: null }).location,
  ).toBe('');
});
