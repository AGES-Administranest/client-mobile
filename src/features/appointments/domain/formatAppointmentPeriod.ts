import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import type { Appointment } from './appointment';

export function formatAppointmentPeriod(
  appointment: Pick<Appointment, 'startsAt' | 'endsAt'>,
  locale: string,
): string {
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const day = formatDayAndMonth(start, locale);
  const startTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);
  const endTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(end);

  return `${day} · ${startTime} - ${endTime}`;
}
