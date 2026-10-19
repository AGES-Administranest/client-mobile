import { ApiError } from 'shared/services/apiClient';

import { pricingService } from './pricingService';

const ID_TOKEN = 'id-token';
const GOALS = {
  monthlyIncomeGoal: 8000.5,
  weeklyHours: 37.5,
  safetyMarginPct: 10,
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

test('puts the goals with the id token and returns what the API saved', async () => {
  const saved = { ...GOALS, updatedAt: '2026-10-13T12:00:00.000Z' };
  respondWith(200, saved);

  await expect(pricingService.saveSettings(ID_TOKEN, GOALS)).resolves.toEqual(
    saved,
  );

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toMatch(/\/pricing-settings$/);
  expect(init.method).toBe('PUT');
  expect(JSON.parse(init.body as string)).toEqual(GOALS);
  expect((init.headers as Record<string, string>).Authorization).toBe(
    `Bearer ${ID_TOKEN}`,
  );
});

test('rethrows a refused save as an ApiError with its code', async () => {
  respondWith(400, { code: 'VALIDATION_ERROR', message: 'Invalid request' });

  const failure = pricingService.saveSettings(ID_TOKEN, GOALS);

  await expect(failure).rejects.toBeInstanceOf(ApiError);
  await expect(failure).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
  });
});
