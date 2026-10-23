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

describe('getHourlyRate (stand-in until the backend serves it)', () => {
  const OCTOBER = { month: 10, year: 2026 };
  const SUMMARY = {
    professionalExpenses: '1225.00',
    personalExpenses: '860.00',
    depreciation: '189.08',
    transport: '350.00',
    total: '2624.08',
  };

  function respondTo(routes: Record<string, [number, unknown]>) {
    fetchMock.mockImplementation(async (url: string) => {
      const path = Object.keys(routes).find(route => url.includes(route));
      const [status, body] = path ? routes[path] : [404, {}];
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      };
    });
  }

  test('calculates from the goals and the fixed costs of the month', async () => {
    respondTo({
      '/pricing-settings': [
        200,
        { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
      ],
      '/fixed-costs/summary': [200, SUMMARY],
    });

    const rate = await pricingService.getHourlyRate(ID_TOKEN, OCTOBER);

    expect(rate).toMatchObject({
      month: OCTOBER,
      parts: {
        fixedCosts: 1399.08,
        variableCosts: 1225,
        proLabore: 8000,
        safetyMargin: 2124.82,
      },
      hourlyRate: 98.07,
      minimumHourlyRate: 81.72,
    });
    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls).toContainEqual(
      expect.stringMatching(/\/fixed-costs\/summary\?month=10&year=2026$/),
    );
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${ID_TOKEN}`,
      );
    }
  });

  test('is null while the goals are not configured', async () => {
    respondTo({
      '/pricing-settings': [
        404,
        { code: 'PRICING_SETTINGS_NOT_FOUND', message: 'Not configured' },
      ],
      '/fixed-costs/summary': [200, SUMMARY],
    });

    await expect(
      pricingService.getHourlyRate(ID_TOKEN, OCTOBER),
    ).resolves.toBeNull();
  });

  test('fails when the fixed costs cannot be read', async () => {
    respondTo({
      '/pricing-settings': [
        200,
        { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
      ],
      '/fixed-costs/summary': [500, { code: 'INTERNAL', message: 'Boom' }],
    });

    await expect(
      pricingService.getHourlyRate(ID_TOKEN, OCTOBER),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
