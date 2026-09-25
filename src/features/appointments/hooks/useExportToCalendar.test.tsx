import ReactTestRenderer, { act } from 'react-test-renderer';

import { useExportToCalendar } from './useExportToCalendar';
import type { Appointment } from '../domain/appointment';
import {
  addAppointmentToCalendar,
  requestCalendarPermission,
} from '../services/calendarService';

jest.mock('../services/calendarService', () => ({
  requestCalendarPermission: jest.fn(),
  addAppointmentToCalendar: jest.fn(),
}));

const requestCalendarPermissionMock =
  requestCalendarPermission as jest.MockedFunction<
    typeof requestCalendarPermission
  >;
const addAppointmentToCalendarMock =
  addAppointmentToCalendar as jest.MockedFunction<
    typeof addAppointmentToCalendar
  >;

const APPOINTMENT: Appointment = {
  id: 'appointment-1',
  procedureName: 'Ovariohisterectomia - Mel',
  startsAt: '2026-10-02T14:00:00',
  endsAt: '2026-10-02T15:30:00',
  client: { name: 'Ana Beatriz Souza' },
  notes: 'Paciente em jejum desde as 20h do dia anterior.',
};

beforeEach(() => {
  jest.clearAllMocks();
  requestCalendarPermissionMock.mockResolvedValue('granted');
  addAppointmentToCalendarMock.mockResolvedValue('event-1');
});

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useExportToCalendar>,
  };

  function Harness() {
    result.current = useExportToCalendar(APPOINTMENT);
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(<Harness />);
  });

  return { result };
}

test('creates the calendar event and reports success when permission is granted', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.exportToCalendar();
  });

  expect(addAppointmentToCalendarMock).toHaveBeenCalledWith(
    expect.objectContaining({
      title: APPOINTMENT.procedureName,
      location: APPOINTMENT.client.name,
    }),
  );
  expect(result.current.status).toBe('success');
});

test('reports permission denied without creating an event', async () => {
  requestCalendarPermissionMock.mockResolvedValue('denied');
  const { result } = await mountHook();

  await act(async () => {
    await result.current.exportToCalendar();
  });

  expect(addAppointmentToCalendarMock).not.toHaveBeenCalled();
  expect(result.current.status).toBe('permissionDenied');
});

test('reports an error when creating the event fails unexpectedly', async () => {
  addAppointmentToCalendarMock.mockRejectedValue(new Error('OS unavailable'));
  const { result } = await mountHook();

  await act(async () => {
    await result.current.exportToCalendar();
  });

  expect(result.current.status).toBe('error');
});

test('reset returns the status to idle', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.exportToCalendar();
  });
  expect(result.current.status).toBe('success');

  act(() => {
    result.current.reset();
  });

  expect(result.current.status).toBe('idle');
});
