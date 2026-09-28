import ReactTestRenderer, { act } from 'react-test-renderer';

import { useAppointments } from './useAppointments';
import * as appointmentService from '../services/appointmentService';

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
  beforeEach(() => {
    jest.clearAllMocks();
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
});
