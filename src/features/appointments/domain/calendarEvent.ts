import type { Appointment } from './appointment';

export type CalendarEventInput = {
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  notes?: string;
};

export function toCalendarEventInput(
  appointment: Appointment,
): CalendarEventInput {
  const notes = appointment.notes?.trim();

  return {
    title: appointment.procedureName,
    startDate: new Date(appointment.startsAt),
    endDate: new Date(appointment.endsAt),
    location: appointment.client.name,
    notes: notes ? notes : undefined,
  };
}
