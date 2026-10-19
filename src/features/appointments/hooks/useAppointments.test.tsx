import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useAppointments } from './useAppointments';
import * as appointmentService from '../services/appointmentService';
import { queueAppointmentCreate } from '../services/offlineAppointmentStore';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'test-token' },
    account: { id: 'test-user' },
    signOut: jest.fn(),
  }),
}));

jest.mock('../services/appointmentService');

const mockFetch = appointmentService.fetchAppointments as jest.Mock;

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useAppointments>,
  };

  function Harness() {
    result.current = useAppointments();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(<Harness />);
  });

  return { result };
}

describe('useAppointments', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFetch.mockImplementation(async (_token, { status }) =>
      status === 'SCHEDULED'
        ? [
            {
              id: '1',
              patientName: 'Mel',
              startsAt: '2026-08-17T09:00:00.000Z',
              status: 'SCHEDULED',
            },
          ]
        : [],
    );
  });

  it('initializes with current month and loads appointments', async () => {
    const { result } = await mountHook();

    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.appointments[0].patientName).toBe('Mel');
    expect(mockFetch).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        status: 'SCHEDULED',
      }),
    );
  });

  it('loads every status, since the API filters one at a time', async () => {
    await mountHook();

    for (const status of ['SCHEDULED', 'COMPLETED', 'CANCELED']) {
      expect(mockFetch).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({ status }),
      );
    }
  });

  it('brings the month of a date picked outside it into view', async () => {
    const { result } = await mountHook();

    await act(async () => {
      result.current.onSelectDate('2030-01-15');
    });

    expect(result.current.monthString).toBe('2030-01');
  });

  it('navigates to previous and next month and reloads data', async () => {
    const { result } = await mountHook();
    const initialMonth = result.current.monthString;

    await act(async () => {
      result.current.onNextMonth();
    });

    expect(result.current.monthString).not.toBe(initialMonth);
    expect(mockFetch).toHaveBeenCalledTimes(6);

    await act(async () => {
      result.current.onPreviousMonth();
    });

    expect(result.current.monthString).toBe(initialMonth);
    expect(mockFetch).toHaveBeenCalledTimes(9);
  });

  it('updates selected date and filters day appointments', async () => {
    const { result } = await mountHook();

    await act(async () => {
      result.current.onSelectDate('2026-08-17');
    });

    expect(result.current.selectedDate).toBe('2026-08-17');
    expect(result.current.selectedDayAppointments).toHaveLength(1);
    expect(result.current.selectedDayAppointments[0].id).toBe('1');
  });

  describe('sem conexão', () => {
    const today = new Date();
    const inThisMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      15,
      10,
    ).toISOString();
    const offline = () =>
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    it('mostra o mês salvo da última vez, somando o que foi criado offline', async () => {
      mockFetch.mockImplementation(async (_token, { status }) =>
        status === 'SCHEDULED'
          ? [
              {
                id: '2',
                patientName: 'Luna',
                startsAt: inThisMonth,
                status: 'SCHEDULED',
              },
            ]
          : [],
      );
      await mountHook();
      offline();
      await queueAppointmentCreate('test-user', 'cg-1', {
        startsAt: inThisMonth,
        status: 'SCHEDULED',
        patientName: 'Thomas',
      });

      const { result } = await mountHook();

      expect(result.current.isOffline).toBe(true);
      expect(result.current.error).toBeNull();
      expect(
        result.current.appointments.map(appointment => appointment.patientName),
      ).toEqual(['Luna', 'Thomas']);
      expect(result.current.appointments[1]).toMatchObject({
        id: 'local:cg-1',
        pendingSync: true,
      });
    });

    it('um mês nunca aberto com rede aparece vazio, sem erro', async () => {
      offline();

      const { result } = await mountHook();

      expect(result.current.isOffline).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.appointments).toEqual([]);
    });

    it('a agenda aberta se refaz quando algo entra na fila', async () => {
      const { result } = await mountHook();
      offline();

      await act(async () => {
        await queueAppointmentCreate('test-user', 'cg-2', {
          startsAt: inThisMonth,
          status: 'SCHEDULED',
          patientName: 'Nina',
        });
      });

      expect(
        result.current.appointments.some(
          appointment => appointment.patientName === 'Nina',
        ),
      ).toBe(true);
    });
  });
});
