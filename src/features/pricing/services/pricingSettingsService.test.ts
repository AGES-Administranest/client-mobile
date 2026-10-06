import { ApiError } from 'shared/services/apiClient';

import { fetchPricingSettings } from './pricingSettingsService';

const ID_TOKEN = 'id-token';
const SETTINGS = {
  monthlyNetIncomeGoal: 8000,
  weeklyAvailableHours: 40,
  safetyMarginPercent: 10,
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function respondWith(status: number, body: unknown) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

test('asks the API with the id token and returns the saved settings', async () => {
  respondWith(200, SETTINGS);

  await expect(fetchPricingSettings(ID_TOKEN)).resolves.toEqual(SETTINGS);

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toMatch(/\/pricing-settings$/);
  expect(init.method).toBe('GET');
  expect((init.headers as Record<string, string>).Authorization).toBe(
    `Bearer ${ID_TOKEN}`,
  );
});

test('treats 404 as not configured yet, not as a failure', async () => {
  respondWith(404, { code: 'PRICING_SETTINGS_NOT_FOUND', message: 'x' });

  await expect(fetchPricingSettings(ID_TOKEN)).resolves.toBeNull();
});

test.each([400, 401, 500])('rethrows a %i as an ApiError', async status => {
  respondWith(status, { message: 'boom' });

  const failure = fetchPricingSettings(ID_TOKEN);

  await expect(failure).rejects.toBeInstanceOf(ApiError);
  await expect(failure).rejects.toMatchObject({ status });
});
