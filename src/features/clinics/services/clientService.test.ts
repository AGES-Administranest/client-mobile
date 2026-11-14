import { apiClient } from 'shared/services/apiClient';

import { fetchClientAppointments, fetchClientSummary } from './clientService';
import { HISTORY_PAGE_SIZE } from '../domain/clientHistory';

jest.mock('shared/services/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const NOVEMBER = { from: '2026-11-01', to: '2026-11-30' };

beforeEach(() => {
  getMock.mockReset();
});

describe('fetchClientAppointments', () => {
  it('asks for one page of the period with the session token', async () => {
    getMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: HISTORY_PAGE_SIZE,
    });

    await fetchClientAppointments('id-token', 'client-1', NOVEMBER, 2);

    expect(getMock).toHaveBeenCalledWith(
      `/client/client-1/appointments?from=2026-11-01&to=2026-11-30&page=2&limit=${HISTORY_PAGE_SIZE}`,
      { token: 'id-token' },
    );
  });

  it('reads the amounts as numbers and keeps the total of the period', async () => {
    getMock.mockResolvedValue({
      items: [
        {
          id: 'appointment-1',
          startsAt: '2026-11-03T16:00:00.000Z',
          procedureName: 'Orquiectomia',
          patientName: 'Mel',
          amount: '620.00',
        },
        {
          id: 'appointment-2',
          startsAt: '2026-11-02T16:00:00.000Z',
          procedureName: null,
          patientName: null,
          amount: null,
        },
      ],
      total: 13,
      page: 1,
      limit: HISTORY_PAGE_SIZE,
    });

    const page = await fetchClientAppointments(
      'id-token',
      'client-1',
      NOVEMBER,
      1,
    );

    expect(page.total).toBe(13);
    expect(page.appointments.map(item => item.amount)).toEqual([620, null]);
    expect(page.appointments[1].procedureName).toBeNull();
  });
});

describe('fetchClientSummary', () => {
  it('asks for the totals of the period with the session token', async () => {
    getMock.mockResolvedValue({
      appointmentsCount: 6,
      billedTotal: '3420.00',
      tripCost: '96.50',
      tripCount: 4,
    });

    const summary = await fetchClientSummary('id-token', 'client-1', NOVEMBER);

    expect(getMock).toHaveBeenCalledWith(
      '/client/client-1/summary?from=2026-11-01&to=2026-11-30',
      { token: 'id-token' },
    );
    expect(summary).toEqual({
      appointmentsCount: 6,
      billedTotal: 3420,
      tripCost: 96.5,
      tripCount: 4,
    });
  });

  it('passes the API failure on', async () => {
    const failure = new Error('Client not found');
    getMock.mockRejectedValue(failure);

    await expect(
      fetchClientSummary('id-token', 'client-1', NOVEMBER),
    ).rejects.toBe(failure);
  });
});
