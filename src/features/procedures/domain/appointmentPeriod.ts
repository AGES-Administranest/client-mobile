import { fromCalendarDate, type CalendarRange } from 'shared/utils/calendar';

export type AppointmentPeriod = {
  from?: string;
  to?: string;
};

export function hasActivePeriod(range: CalendarRange): boolean {
  return range.from !== null || range.to !== null;
}

export function toAppointmentPeriod(range: CalendarRange): AppointmentPeriod {
  const period: AppointmentPeriod = {};

  if (range.from !== null) {
    period.from = fromCalendarDate(range.from).toISOString();
  }
  if (range.to !== null) {
    const endOfDay = fromCalendarDate(range.to);
    endOfDay.setHours(23, 59, 59, 999);
    period.to = endOfDay.toISOString();
  }

  return period;
}
