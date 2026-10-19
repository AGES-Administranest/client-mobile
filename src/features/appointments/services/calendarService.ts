import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import type { CalendarEventInput } from '../domain/calendarEvent';
import { selectWritableCalendarId } from '../domain/selectWritableCalendarId';

export type CalendarPermissionResult = 'granted' | 'denied';

export async function requestCalendarPermission(): Promise<CalendarPermissionResult> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  return granted ? 'granted' : 'denied';
}

const FALLBACK_CALENDAR_TITLE = 'Administranest';

// iOS expõe um único calendário padrão (getDefaultCalendarAsync). Android não
// tem esse conceito, então é preciso escolher um calendário gravável já
// existente (selectWritableCalendarId) ou criar um local na primeira vez.
async function resolveCalendarId(): Promise<string> {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.id;
  }

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const existingId = selectWritableCalendarId(calendars);
  if (existingId) {
    return existingId;
  }

  return Calendar.createCalendarAsync({
    title: FALLBACK_CALENDAR_TITLE,
    color: '#594236',
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: FALLBACK_CALENDAR_TITLE,
      type: Calendar.SourceType.LOCAL,
    },
    name: FALLBACK_CALENDAR_TITLE,
    ownerAccount: FALLBACK_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/** Retorna o id do evento criado no calendário nativo do aparelho. */
export async function addAppointmentToCalendar(
  event: CalendarEventInput,
): Promise<string> {
  const calendarId = await resolveCalendarId();

  return Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    notes: event.notes,
  });
}
