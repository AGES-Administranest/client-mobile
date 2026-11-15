import { apiClient } from 'shared/services/apiClient';

import { fetchReportAvailability } from './reportAvailabilityService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn() },
}));

const get = jest.mocked(apiClient.get);

beforeEach(() => {
  get.mockReset();
});

describe('fetchReportAvailability', () => {
  it('asks GET /reports/availability for the period with the token, without userId', async () => {
    get.mockResolvedValue({ total: 3 });

    await expect(
      fetchReportAvailability('id-token', {
        from: '2026-10-01',
        to: '2026-10-31',
      }),
    ).resolves.toEqual({ total: 3 });

    expect(get).toHaveBeenCalledTimes(1);
    const [path, options] = get.mock.calls[0];
    expect(path).toBe('/reports/availability?from=2026-10-01&to=2026-10-31');
    expect(path).not.toContain('userId');
    expect(options).toEqual(expect.objectContaining({ token: 'id-token' }));
  });

  it('lets a failed request reach the caller', async () => {
    const failure = new Error('boom');
    get.mockRejectedValue(failure);

    await expect(
      fetchReportAvailability('id-token', {
        from: '2026-10-01',
        to: '2026-10-31',
      }),
    ).rejects.toBe(failure);
  });
});
