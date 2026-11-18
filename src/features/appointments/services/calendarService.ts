import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import { LOCAL_DATA_KEY_PREFIX } from 'shared/services/localData';

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

// Agendamento -> evento do aparelho, para remarcar/cancelar atualizar o mesmo
// evento. O prefixo faz o logout limpar este mapa junto com os outros dados.
const EVENT_IDS_KEY = `${LOCAL_DATA_KEY_PREFIX}calendarEventIds`;

async function readEventIds(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(EVENT_IDS_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function saveEventId(appointmentId: string, eventId: string | null) {
  const ids = await readEventIds();
  if (eventId) {
    ids[appointmentId] = eventId;
  } else {
    delete ids[appointmentId];
  }
  await AsyncStorage.setItem(EVENT_IDS_KEY, JSON.stringify(ids));
}

/**
 * Cria o evento no calendário nativo e devolve o id. Com `appointmentId`, um
 * evento já criado para ele é atualizado em vez de duplicado.
 */
export async function addAppointmentToCalendar(
  event: CalendarEventInput,
  appointmentId?: string,
): Promise<string> {
  const details = {
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    notes: event.notes,
  };
  const existingId = appointmentId
    ? (await readEventIds())[appointmentId]
    : undefined;
  if (existingId) {
    try {
      await Calendar.updateEventAsync(existingId, details);
      return existingId;
    } catch {
      // O usuário apagou o evento no aparelho: cria de novo abaixo.
    }
  }

  const eventId = await Calendar.createEventAsync(
    await resolveCalendarId(),
    details,
  );
  if (appointmentId) {
    await saveEventId(appointmentId, eventId);
  }
  return eventId;
}

// Os três abaixo rodam sem o usuário pedir: nunca lançam, e sem permissão ou
// na web simplesmente não fazem nada.
async function quietly(action: () => Promise<unknown>): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await action();
  } catch {
    // O agendamento já está salvo; o calendário é só uma cópia.
  }
}

export function syncAppointmentToCalendar(
  appointmentId: string,
  event: CalendarEventInput,
): Promise<void> {
  return quietly(async () => {
    if ((await requestCalendarPermission()) === 'granted') {
      await addAppointmentToCalendar(event, appointmentId);
    }
  });
}

export function rescheduleCalendarEvent(
  appointmentId: string,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  return quietly(async () => {
    const eventId = (await readEventIds())[appointmentId];
    if (eventId) {
      await Calendar.updateEventAsync(eventId, {
        startDate: new Date(startsAt),
        endDate: new Date(endsAt),
      });
    }
  });
}

export function removeAppointmentFromCalendar(
  appointmentId: string,
): Promise<void> {
  return quietly(async () => {
    const eventId = (await readEventIds())[appointmentId];
    if (eventId) {
      await Calendar.deleteEventAsync(eventId);
      await saveEventId(appointmentId, null);
    }
  });
}
