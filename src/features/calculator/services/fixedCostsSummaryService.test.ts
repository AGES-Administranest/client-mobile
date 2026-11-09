import { apiClient } from 'shared/services/apiClient';

import { fetchFixedCostsSummary } from './fixedCostsSummaryService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn() },
}));

const get = apiClient.get as jest.Mock;

const serverSummary = {
  professionalExpenses: '100.00',
  personalExpenses: '50.00',
  depreciation: '20.00',
  transport: '450.00',
  total: '620.00',
};

beforeEach(() => jest.resetAllMocks());

describe('fetchFixedCostsSummary', () => {
  it('turns the string amounts into numbers', async () => {
    get.mockResolvedValue(serverSummary);

    await expect(fetchFixedCostsSummary('token')).resolves.toMatchObject({
      transportCost: 450,
      total: 620,
    });
  });

  it('sends the month and year when a period is given', async () => {
    get.mockResolvedValue(serverSummary);

    await fetchFixedCostsSummary('token', { month: 10, year: 2026 });

    expect(get).toHaveBeenCalledWith(
      '/fixed-costs/summary?month=10&year=2026',
      { token: 'token' },
    );
  });
});
