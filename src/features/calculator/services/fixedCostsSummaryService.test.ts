import { apiClient } from 'shared/services/apiClient';

import {
  fetchFixedCostsSummary,
  updateTransportCost,
} from './fixedCostsSummaryService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn(), patch: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const patch = apiClient.patch as jest.Mock;

const serverSummary = {
  professionalExpenses: '100.00',
  personalExpenses: '50.00',
  depreciation: '20.00',
  transport: '450.00',
  total: '620.00',
};

beforeEach(() => jest.resetAllMocks());

describe('updateTransportCost', () => {
  it('saves the cost, then returns the summary read from the server', async () => {
    patch.mockResolvedValue({});
    get.mockResolvedValue(serverSummary);

    await expect(updateTransportCost('token', 450)).resolves.toEqual({
      professionalExpenses: 100,
      personalExpenses: 50,
      equipmentDepreciation: 20,
      transportCost: 450,
      total: 620,
    });

    expect(patch).toHaveBeenCalledWith(
      '/pricing-settings/transport',
      { transportCostMonthly: 450 },
      { token: 'token' },
    );
    expect(get).toHaveBeenCalledWith('/fixed-costs/summary', {
      token: 'token',
    });
  });

  it('sends zero as zero', async () => {
    patch.mockResolvedValue({});
    get.mockResolvedValue({ ...serverSummary, transport: '0.00' });

    await updateTransportCost('token', 0);

    expect(patch).toHaveBeenCalledWith(
      '/pricing-settings/transport',
      { transportCostMonthly: 0 },
      { token: 'token' },
    );
  });

  it('reads the summary only after the save', async () => {
    const order: string[] = [];
    patch.mockImplementation(async () => {
      order.push('patch');
    });
    get.mockImplementation(async () => {
      order.push('get');
      return serverSummary;
    });

    await updateTransportCost('token', 450);

    expect(order).toEqual(['patch', 'get']);
  });

  it('does not read the summary when the save fails', async () => {
    patch.mockRejectedValue(new Error('boom'));

    await expect(updateTransportCost('token', 450)).rejects.toThrow('boom');
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses to run without a session', async () => {
    await expect(updateTransportCost('', 450)).rejects.toMatchObject({
      status: 401,
    });
    expect(patch).not.toHaveBeenCalled();
  });
});

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
