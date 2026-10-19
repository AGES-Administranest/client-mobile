import type { Appointment } from './appointment';

export type CalendarEventInput = {
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  notes?: string;
};

// The fields an event needs, so both the calendar's Appointment and the detail
// screen's appointment can be exported.
export type ExportableAppointment = Pick<
  Appointment,
  'procedureName' | 'patientName' | 'startsAt' | 'endsAt' | 'location' | 'notes'
>;

// An appointment may be saved without an end time; the event still needs one.
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export function toCalendarEventInput(
  appointment: ExportableAppointment,
): CalendarEventInput {
  const notes = appointment.notes?.trim();
  const startDate = new Date(appointment.startsAt);

  return {
    // "Ovariohisterectomia - Mel"
    title: [appointment.procedureName, appointment.patientName]
      .filter(Boolean)
      .join(' - '),
    startDate,
    endDate: appointment.endsAt
      ? new Date(appointment.endsAt)
      : new Date(startDate.getTime() + DEFAULT_DURATION_MS),
    location: appointment.location ?? '',
    notes: notes ? notes : undefined,
  };
}
