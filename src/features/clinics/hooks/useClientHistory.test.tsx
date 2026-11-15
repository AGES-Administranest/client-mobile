import ReactTestRenderer, { act } from 'react-test-renderer';

import { NetworkError } from 'shared/api';
import { ApiError } from 'shared/services/apiClient';
import { onConnectionRestored } from 'shared/services/network';

import { useClientHistory } from './useClientHistory';
import {
  HISTORY_PAGE_SIZE,
  type ClientAppointment,
  type ClientAppointmentPage,
  type ClientSummary,
} from '../domain/clientHistory';
import {
  fetchClientAppointments,
  fetchClientSummary,
} from '../services/clientService';

let mockIdToken = 'id-token';
let mockAccountId = 'account-1';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: mockIdToken },
    account: { id: mockAccountId },
  }),
}));

jest.mock('../services/clientService', () => ({
  fetchClientAppointments: jest.fn(),
  fetchClientSummary: jest.fn(),
}));

jest.mock('shared/services/network', () => ({
  onConnectionRestored: jest.fn(),
}));

const appointmentsMock = fetchClientAppointments as jest.MockedFunction<
  typeof fetchClientAppointments
>;
const summaryMock = fetchClientSummary as jest.MockedFunction<
  typeof fetchClientSummary
>;

const NOVEMBER = { from: '2026-11-01', to: '2026-11-30' };
const OCTOBER = { from: '2026-10-01', to: '2026-10-31' };
const DECEMBER = { from: '2026-12-01', to: '2026-12-31' };
const AUGUST = { from: '2026-08-01', to: '2026-08-31' };

function appointment(id: string): ClientAppointment {
  return {
    id,
    startsAt: '2026-11-02T16:00:00.000Z',
    procedureName: 'Orquiectomia',
    patientName: 'Mel',
    amount: 620,
  };
}

function pageOf(
  size: number,
  prefix = 'appointment',
  total = size,
): ClientAppointmentPage {
  return {
    appointments: Array.from({ length: size }, (_, index) =>
      appointment(`${prefix}-${index}`),
    ),
    total,
  };
}

function summaryOf(appointmentsCount: number): ClientSummary {
  return {
    appointmentsCount,
    billedTotal: appointmentsCount * 620,
    tripCost: appointmentsCount * 16,
    tripCount: appointmentsCount,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderHistory(initialClientId: string | null = 'client-1') {
  const result = {
    current: null as unknown as ReturnType<typeof useClientHistory>,
  };

  function TestHarness({ clientId }: { clientId: string | null }) {
    result.current = useClientHistory(clientId);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <TestHarness clientId={initialClientId} />,
    );
  });

  return {
    result,
    rerender: (clientId: string | null) =>
      act(() => {
        renderer.update(<TestHarness clientId={clientId} />);
      }),
  };
}

async function flush() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }
  });
}

const connectionRestoredMock = onConnectionRestored as jest.MockedFunction<
  typeof onConnectionRestored
>;
let restoreConnection: (() => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 3, 10) });
  mockIdToken = 'id-token';
  mockAccountId = 'account-1';
  appointmentsMock.mockReset();
  summaryMock.mockReset();
  restoreConnection = null;
  connectionRestoredMock.mockReset().mockImplementation(listener => {
    restoreConnection = listener;
    return () => {
      restoreConnection = null;
    };
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useClientHistory', () => {
  it('loads the totals and the first page of the current month', async () => {
    summaryMock.mockResolvedValue(summaryOf(2));
    appointmentsMock.mockResolvedValue(pageOf(2));

    const { result } = renderHistory();

    expect(result.current.status).toBe('loading');
    await flush();

    expect(result.current.status).toBe('ready');
    expect(result.current.period).toEqual(NOVEMBER);
    expect(result.current.summary).toEqual(summaryOf(2));
    expect(result.current.appointments).toHaveLength(2);
    expect(result.current.remaining).toBe(0);
    expect(summaryMock).toHaveBeenCalledWith('id-token', 'client-1', NOVEMBER);
    expect(appointmentsMock).toHaveBeenCalledWith(
      'id-token',
      'client-1',
      NOVEMBER,
      1,
    );
  });

  it('counts what is left from the list total and loads the next page', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE + 3));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'first', HISTORY_PAGE_SIZE + 3),
      )
      .mockResolvedValueOnce(pageOf(3, 'second', HISTORY_PAGE_SIZE + 3));

    const { result } = renderHistory();
    await flush();

    expect(result.current.remaining).toBe(3);

    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);
    await flush();

    expect(appointmentsMock).toHaveBeenLastCalledWith(
      'id-token',
      'client-1',
      NOVEMBER,
      2,
    );
    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE + 3);
    expect(result.current.remaining).toBe(0);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('offers nothing more when the period fits in one page', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE));
    appointmentsMock.mockResolvedValue(pageOf(HISTORY_PAGE_SIZE));

    const { result } = renderHistory();
    await flush();

    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it('counts with the total of the newest page', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE + 3));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'first', HISTORY_PAGE_SIZE + 3),
      )
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'second', HISTORY_PAGE_SIZE * 2 + 1),
      );

    const { result } = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    await flush();

    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(1);
  });

  it('reloads for a new period and ignores the late answer of the old one', async () => {
    const lateSummary = deferred<ClientSummary>();
    const lateList = deferred<ClientAppointmentPage>();
    summaryMock
      .mockReturnValueOnce(lateSummary.promise)
      .mockResolvedValueOnce(summaryOf(1));
    appointmentsMock
      .mockReturnValueOnce(lateList.promise)
      .mockResolvedValueOnce(pageOf(1, 'august'));

    const { result } = renderHistory();
    act(() => result.current.setPeriod(AUGUST));
    await flush();

    lateSummary.resolve(summaryOf(4));
    lateList.resolve(pageOf(4, 'november'));
    await flush();

    expect(result.current.period).toEqual(AUGUST);
    expect(result.current.appointments.map(item => item.id)).toEqual([
      'august-0',
    ]);
    expect(result.current.summary).toEqual(summaryOf(1));
  });

  it('keeps the history on screen while the sheet closes', async () => {
    summaryMock.mockResolvedValue(summaryOf(2));
    appointmentsMock.mockResolvedValue(pageOf(2));

    const { result, rerender } = renderHistory('client-1');
    act(() => result.current.setPeriod(AUGUST));
    await flush();

    rerender(null);
    await flush();

    expect(result.current.status).toBe('ready');
    expect(result.current.period).toEqual(AUGUST);
    expect(result.current.summary).toEqual(summaryOf(2));
    expect(result.current.appointments).toHaveLength(2);
  });

  it('starts over from the current month when the sheet opens again', async () => {
    summaryMock.mockResolvedValue(summaryOf(0));
    appointmentsMock.mockResolvedValue(pageOf(0));

    const { result, rerender } = renderHistory('client-1');
    act(() => result.current.setPeriod(AUGUST));
    await flush();

    rerender(null);
    act(() => result.current.reset());
    expect(result.current.status).toBe('loading');
    rerender('client-1');
    await flush();

    expect(result.current.period).toEqual(NOVEMBER);
    expect(summaryMock).toHaveBeenLastCalledWith(
      'id-token',
      'client-1',
      NOVEMBER,
    );
  });

  it('keeps the month it opened on when the month turns', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59, 50));
    summaryMock.mockResolvedValue(summaryOf(2));
    appointmentsMock.mockResolvedValue(pageOf(2));

    const { result, rerender } = renderHistory();
    await flush();

    jest.setSystemTime(new Date(2026, 10, 1, 0, 0, 10));
    rerender('client-1');
    await flush();

    expect(result.current.period).toEqual(OCTOBER);
    expect(summaryMock).toHaveBeenCalledTimes(1);
  });

  it('opens again on the month of that day', async () => {
    summaryMock.mockResolvedValue(summaryOf(0));
    appointmentsMock.mockResolvedValue(pageOf(0));

    const { result, rerender } = renderHistory('client-1');
    await flush();

    rerender(null);
    jest.setSystemTime(new Date(2026, 11, 2, 10));
    act(() => result.current.reset());
    rerender('client-1');
    await flush();

    expect(result.current.period).toEqual(DECEMBER);
    expect(summaryMock).toHaveBeenLastCalledWith(
      'id-token',
      'client-1',
      DECEMBER,
    );
  });

  it('tries again when the same period is applied after a failure', async () => {
    summaryMock
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(summaryOf(1));
    appointmentsMock.mockResolvedValue(pageOf(1));

    const { result } = renderHistory();
    await flush();
    expect(result.current.status).toBe('failed');

    act(() => result.current.setPeriod(NOVEMBER));
    await flush();

    expect(result.current.status).toBe('ready');
    expect(summaryMock).toHaveBeenCalledTimes(2);
  });

  it('shows the loading state while a new period loads', async () => {
    const augustSummary = deferred<ClientSummary>();
    summaryMock
      .mockResolvedValueOnce(summaryOf(2))
      .mockReturnValueOnce(augustSummary.promise);
    appointmentsMock.mockResolvedValue(pageOf(2));

    const { result } = renderHistory();
    await flush();
    expect(result.current.status).toBe('ready');

    act(() => result.current.setPeriod(AUGUST));
    await flush();

    expect(result.current.status).toBe('loading');
    expect(result.current.appointments).toEqual([]);

    augustSummary.resolve(summaryOf(2));
    await flush();
    expect(result.current.status).toBe('ready');
  });

  it('ignores a page that arrives after the period changed', async () => {
    const latePage = deferred<ClientAppointmentPage>();
    summaryMock
      .mockResolvedValueOnce(summaryOf(HISTORY_PAGE_SIZE + 3))
      .mockResolvedValueOnce(summaryOf(1));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'november', HISTORY_PAGE_SIZE + 3),
      )
      .mockReturnValueOnce(latePage.promise)
      .mockResolvedValueOnce(pageOf(1, 'august'));

    const { result } = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    act(() => result.current.setPeriod(AUGUST));
    await flush();

    latePage.resolve(pageOf(3, 'late'));
    await flush();

    expect(result.current.appointments.map(item => item.id)).toEqual([
      'august-0',
    ]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('asks for the next page only once on a double tap', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE + 3));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'first', HISTORY_PAGE_SIZE + 3),
      )
      .mockResolvedValue(pageOf(3, 'second', HISTORY_PAGE_SIZE + 3));

    const { result } = renderHistory();
    await flush();

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    await flush();

    expect(appointmentsMock).toHaveBeenCalledTimes(2);
    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE + 3);
  });

  it('opens another clinic back on the current month', async () => {
    summaryMock.mockResolvedValue(summaryOf(0));
    appointmentsMock.mockResolvedValue(pageOf(0));

    const { result, rerender } = renderHistory('client-1');
    act(() => result.current.setPeriod(AUGUST));
    await flush();

    rerender('client-2');
    await flush();

    expect(result.current.period).toEqual(NOVEMBER);
    expect(summaryMock).toHaveBeenLastCalledWith(
      'id-token',
      'client-2',
      NOVEMBER,
    );
  });

  it('explains a missing connection and loads again on reload', async () => {
    summaryMock
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(summaryOf(1));
    appointmentsMock.mockResolvedValue(pageOf(1));

    const { result } = renderHistory();
    await flush();

    expect(result.current.status).toBe('failed');
    expect(result.current.failure).toBe('clinics.history.failures.network');

    act(() => result.current.reload());
    await flush();

    expect(result.current.status).toBe('ready');
    expect(result.current.failure).toBeNull();
    expect(result.current.appointments).toHaveLength(1);
  });

  it('loads again by itself when the connection comes back', async () => {
    summaryMock
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(summaryOf(1));
    appointmentsMock.mockResolvedValue(pageOf(1));

    const { result } = renderHistory();
    await flush();
    expect(result.current.status).toBe('failed');
    expect(restoreConnection).not.toBeNull();

    act(() => restoreConnection?.());
    await flush();

    expect(result.current.status).toBe('ready');
    expect(restoreConnection).toBeNull();
  });

  it('tells when the session expired', async () => {
    summaryMock.mockRejectedValue(new ApiError('Unauthorized', null, 401));
    appointmentsMock.mockResolvedValue(pageOf(0));

    const { result } = renderHistory();
    await flush();

    expect(result.current.failure).toBe('clinics.history.failures.session');
  });

  it('tells when the clinic no longer exists', async () => {
    summaryMock.mockRejectedValue(
      new ApiError('Client not found', 'CLIENT_NOT_FOUND', 404),
    );
    appointmentsMock.mockResolvedValue(pageOf(0));

    const { result } = renderHistory();
    await flush();

    expect(result.current.failure).toBe('clinics.history.failures.notFound');
  });

  it('keeps the list when the next page fails and lets the person try again', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE + 1));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'first', HISTORY_PAGE_SIZE + 1),
      )
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(pageOf(1, 'second', HISTORY_PAGE_SIZE + 1));

    const { result } = renderHistory();
    await flush();

    act(() => result.current.loadMore());
    await flush();

    expect(result.current.loadMoreFailed).toBe(true);
    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE);
    expect(result.current.status).toBe('ready');

    act(() => result.current.loadMore());
    await flush();

    expect(result.current.loadMoreFailed).toBe(false);
    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE + 1);
  });

  it('keeps the loaded pages when the session token is renewed', async () => {
    summaryMock.mockResolvedValue(summaryOf(HISTORY_PAGE_SIZE * 2 + 1));
    appointmentsMock
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'first', HISTORY_PAGE_SIZE * 2 + 1),
      )
      .mockResolvedValueOnce(
        pageOf(HISTORY_PAGE_SIZE, 'second', HISTORY_PAGE_SIZE * 2 + 1),
      )
      .mockResolvedValueOnce(pageOf(1, 'third', HISTORY_PAGE_SIZE * 2 + 1));

    const { result, rerender } = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    await flush();

    mockIdToken = 'renewed-token';
    rerender('client-1');
    await flush();

    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE * 2);
    expect(summaryMock).toHaveBeenCalledTimes(1);
    expect(appointmentsMock).toHaveBeenCalledTimes(2);

    act(() => result.current.loadMore());
    await flush();

    expect(appointmentsMock).toHaveBeenLastCalledWith(
      'renewed-token',
      'client-1',
      NOVEMBER,
      3,
    );
    expect(result.current.appointments).toHaveLength(HISTORY_PAGE_SIZE * 2 + 1);
  });

  it('loads again for another account', async () => {
    summaryMock.mockResolvedValue(summaryOf(1));
    appointmentsMock.mockResolvedValue(pageOf(1));

    const { rerender } = renderHistory();
    await flush();

    mockAccountId = 'account-2';
    rerender('client-1');
    await flush();

    expect(summaryMock).toHaveBeenCalledTimes(2);
  });

  it('asks with the new token when the account changes', async () => {
    summaryMock.mockResolvedValue(summaryOf(1));
    appointmentsMock.mockResolvedValue(pageOf(1));

    const { rerender } = renderHistory();
    await flush();

    mockAccountId = 'account-2';
    mockIdToken = 'other-token';
    rerender('client-1');
    await flush();

    expect(summaryMock).toHaveBeenCalledTimes(2);
    expect(summaryMock).toHaveBeenLastCalledWith(
      'other-token',
      'client-1',
      NOVEMBER,
    );
  });

  it('does not ask the API about a clinic created offline', async () => {
    const { result } = renderHistory('local:clinic-1');
    await flush();

    expect(result.current.status).toBe('ready');
    expect(result.current.appointments).toEqual([]);
    expect(summaryMock).not.toHaveBeenCalled();
    expect(appointmentsMock).not.toHaveBeenCalled();
  });
});
