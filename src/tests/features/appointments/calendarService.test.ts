import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import {
  addAppointmentToCalendar,
  removeAppointmentFromCalendar,
  requestCalendarPermission,
  rescheduleCalendarEvent,
  syncAppointmentToCalendar,
} from 'features/appointments/services/calendarService';

jest.mock('expo-calendar/legacy', () => ({
  EntityTypes: { EVENT: 'event' },
  SourceType: { LOCAL: 'local' },
  CalendarAccessLevel: { OWNER: 'owner' },
  requestCalendarPermissionsAsync: jest.fn(),
  getDefaultCalendarAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  updateEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
}));

const calendar = jest.mocked(Calendar);
const originalOS = Platform.OS;

const EVENT = {
  title: 'Anestesia · Maya',
  startDate: new Date('2026-10-20T13:00:00.000Z'),
  endDate: new Date('2026-10-20T14:00:00.000Z'),
  location: 'VetSul',
  notes: 'ASA II',
};

const onPlatform = (os: typeof Platform.OS) => {
  Platform.OS = os;
};

const grant = (granted: boolean) =>
  calendar.requestCalendarPermissionsAsync.mockResolvedValue({
    granted,
  } as never);

beforeEach(async () => {
  Object.values(calendar).forEach(value => {
    if (jest.isMockFunction(value)) value.mockReset();
  });
  onPlatform('ios');
  grant(true);
  calendar.getDefaultCalendarAsync.mockResolvedValue({ id: 'ios' } as never);
  calendar.createEventAsync.mockResolvedValue('event-1');
  await AsyncStorage.clear();
});

afterAll(() => onPlatform(originalOS));

describe('requestCalendarPermission', () => {
  it.each([
    [true, 'granted'],
    [false, 'denied'],
  ])('answers what the person chose (%s)', async (granted, expected) => {
    grant(granted);

    await expect(requestCalendarPermission()).resolves.toBe(expected);
  });
});

describe('addAppointmentToCalendar', () => {
  it('writes to the default calendar on iOS', async () => {
    await expect(addAppointmentToCalendar(EVENT)).resolves.toBe('event-1');

    expect(calendar.createEventAsync).toHaveBeenCalledWith('ios', EVENT);
  });

  it('picks a writable calendar on Android', async () => {
    onPlatform('android');
    calendar.getCalendarsAsync.mockResolvedValue([
      { id: 'read', allowsModifications: false },
      { id: 'write', allowsModifications: true },
    ] as never);

    await addAppointmentToCalendar(EVENT);

    expect(calendar.createEventAsync).toHaveBeenCalledWith('write', EVENT);
    expect(calendar.createCalendarAsync).not.toHaveBeenCalled();
  });

  it('creates a calendar on an Android without a writable one', async () => {
    onPlatform('android');
    calendar.getCalendarsAsync.mockResolvedValue([]);
    calendar.createCalendarAsync.mockResolvedValue('created');

    await addAppointmentToCalendar(EVENT);

    expect(calendar.createCalendarAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Administranest' }),
    );
    expect(calendar.createEventAsync).toHaveBeenCalledWith('created', EVENT);
  });

  it('updates the event of an appointment instead of repeating it', async () => {
    await addAppointmentToCalendar(EVENT, 'appointment-1');

    await expect(
      addAppointmentToCalendar(EVENT, 'appointment-1'),
    ).resolves.toBe('event-1');

    expect(calendar.createEventAsync).toHaveBeenCalledTimes(1);
    expect(calendar.updateEventAsync).toHaveBeenCalledWith('event-1', EVENT);
  });

  it('creates the event again when the person deleted it', async () => {
    await addAppointmentToCalendar(EVENT, 'appointment-1');
    calendar.updateEventAsync.mockRejectedValueOnce(new Error('gone'));
    calendar.createEventAsync.mockResolvedValue('event-2');

    await expect(
      addAppointmentToCalendar(EVENT, 'appointment-1'),
    ).resolves.toBe('event-2');

    await rescheduleCalendarEvent('appointment-1', 'a', 'b');
    expect(calendar.updateEventAsync).toHaveBeenLastCalledWith(
      'event-2',
      expect.anything(),
    );
  });

  it('starts over when the saved ids cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{broken');

    await expect(
      addAppointmentToCalendar(EVENT, 'appointment-1'),
    ).resolves.toBe('event-1');
  });
});

describe('what runs without the person asking', () => {
  it('adds the appointment only with permission', async () => {
    grant(false);
    await syncAppointmentToCalendar('appointment-1', EVENT);
    expect(calendar.createEventAsync).not.toHaveBeenCalled();

    grant(true);
    await syncAppointmentToCalendar('appointment-1', EVENT);
    expect(calendar.createEventAsync).toHaveBeenCalledTimes(1);
  });

  it('moves the event of the appointment, when there is one', async () => {
    const startsAt = '2026-10-21T13:00:00.000Z';
    const endsAt = '2026-10-21T14:00:00.000Z';
    await rescheduleCalendarEvent('appointment-1', startsAt, endsAt);
    expect(calendar.updateEventAsync).not.toHaveBeenCalled();

    await addAppointmentToCalendar(EVENT, 'appointment-1');
    await rescheduleCalendarEvent('appointment-1', startsAt, endsAt);

    expect(calendar.updateEventAsync).toHaveBeenCalledWith('event-1', {
      startDate: new Date(startsAt),
      endDate: new Date(endsAt),
    });
  });

  it('removes the event once', async () => {
    await removeAppointmentFromCalendar('appointment-1');
    expect(calendar.deleteEventAsync).not.toHaveBeenCalled();

    await addAppointmentToCalendar(EVENT, 'appointment-1');
    await removeAppointmentFromCalendar('appointment-1');
    await removeAppointmentFromCalendar('appointment-1');

    expect(calendar.deleteEventAsync).toHaveBeenCalledTimes(1);
    expect(calendar.deleteEventAsync).toHaveBeenCalledWith('event-1');
  });

  it('never fails: the appointment is already saved', async () => {
    calendar.createEventAsync.mockRejectedValue(new Error('broke'));

    await expect(
      syncAppointmentToCalendar('appointment-1', EVENT),
    ).resolves.toBeUndefined();
  });

  it('does nothing on the web', async () => {
    onPlatform('web');

    await syncAppointmentToCalendar('appointment-1', EVENT);

    expect(calendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
  });
});
