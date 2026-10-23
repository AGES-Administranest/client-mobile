import { ApiError } from 'shared/services/apiClient';

import {
  fetchFixedCostsSummary,
  updateTransportCost,
} from './fixedCostsSummaryService';

const ID_TOKEN = 'id-token';
const SUMMARY = {
  professionalExpenses: '1225.00',
  personalExpenses: '860.00',
  depreciation: '189.08',
  transport: '400.00',
  total: '2674.08',
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.includes('/pricing-settings/transport')
        ? { transportCostMonthly: 400, updatedAt: '2026-10-19T20:42:00.000Z' }
        : SUMMARY,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

test('reads the summary of a month as numbers', async () => {
  await expect(
    fetchFixedCostsSummary(ID_TOKEN, { month: 9, year: 2026 }),
  ).resolves.toEqual({
    professionalExpenses: 1225,
    personalExpenses: 860,
    equipmentDepreciation: 189.08,
    transportCost: 400,
    total: 2674.08,
  });
  expect(fetchMock.mock.calls[0][0]).toMatch(
    /\/fixed-costs\/summary\?month=9&year=2026$/,
  );
});

test('patches the transport and reads the summary of the same month again', async () => {
  const summary = await updateTransportCost(ID_TOKEN, 400, {
    month: 10,
    year: 2026,
  });

  const [patchUrl, patchInit] = fetchMock.mock.calls[0] as [
    string,
    RequestInit,
  ];
  expect(patchUrl).toMatch(/\/pricing-settings\/transport$/);
  expect(patchInit.method).toBe('PATCH');
  expect(JSON.parse(patchInit.body as string)).toEqual({
    transportCostMonthly: 400,
  });
  expect(fetchMock.mock.calls[1][0]).toMatch(
    /\/fixed-costs\/summary\?month=10&year=2026$/,
  );
  expect(summary.transportCost).toBe(400);
});

test('does not call the API without a token', async () => {
  await expect(updateTransportCost('', 400)).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock).not.toHaveBeenCalled();
});
