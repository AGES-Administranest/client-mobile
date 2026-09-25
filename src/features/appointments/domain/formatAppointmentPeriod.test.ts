import { formatAppointmentPeriod } from './formatAppointmentPeriod';

const APPOINTMENT = {
  startsAt: '2026-10-02T14:00:00',
  endsAt: '2026-10-02T15:30:00',
};

test('renders the day, start time and end time in pt-BR', () => {
  expect(formatAppointmentPeriod(APPOINTMENT, 'pt-BR')).toBe(
    '02 out · 14:00 - 15:30',
  );
});

test('follows the locale time format in en-US', () => {
  expect(formatAppointmentPeriod(APPOINTMENT, 'en-US')).toBe(
    'Oct 02 · 02:00 PM - 03:30 PM',
  );
});
