import { ApiError } from 'shared/services/apiClient';

import { isPricingUnconfiguredError, pricingService } from './pricingService';

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

describe('getHourlyRate', () => {
  const OCTOBER = { month: 10, year: 2026 };
  const RESPONSE = {
    month: 10,
    year: 2026,
    items: [
      { key: 'FIXED_COSTS', amount: '1399.08' },
      { key: 'VARIABLE_COSTS', amount: '1225.00' },
      { key: 'OWNER_DRAW', amount: '8000.00' },
      { key: 'SAFETY_MARGIN', amount: '2124.82' },
    ].map(item => ({ ...item, label: item.key, percentOfTotal: '0.00' })),
    total: '12748.90',
    productiveHours: '130.00',
    hourlyRate: '98.07',
    minimumHourlyRate: '81.72',
    calculatedAt: '2026-10-19T20:42:00.000Z',
  };
  const NOT_CONFIGURED: [number, unknown] = [
    404,
    { code: 'PRICING_SETTINGS_NOT_FOUND', message: 'Not configured' },
  ];

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

  test('reads the rate of the month from the backend, with the goals', async () => {
    respondTo({
      '/pricing-settings': [
        200,
        { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
      ],
      '/pricing/hourly-rate': [200, RESPONSE],
    });

    const rate = await pricingService.getHourlyRate(ID_TOKEN, OCTOBER);

    expect(rate).toMatchObject({
      month: OCTOBER,
      settings: { monthlyIncomeGoal: 8000, weeklyHours: 30 },
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
      expect.stringMatching(/\/pricing\/hourly-rate\?month=10&year=2026$/),
    );
    expect(urls).not.toContainEqual(
      expect.stringContaining('/fixed-costs/summary'),
    );
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${ID_TOKEN}`,
      );
    }
  });

  test('is null while the goals are not configured', async () => {
    respondTo({
      '/pricing-settings': NOT_CONFIGURED,
      '/pricing/hourly-rate': NOT_CONFIGURED,
    });

    await expect(
      pricingService.getHourlyRate(ID_TOKEN, OCTOBER),
    ).resolves.toBeNull();
  });

  test('fails when the rate cannot be read', async () => {
    respondTo({
      '/pricing-settings': [
        200,
        { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
      ],
      '/pricing/hourly-rate': [500, { code: 'INTERNAL', message: 'Boom' }],
    });

    await expect(
      pricingService.getHourlyRate(ID_TOKEN, OCTOBER),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getHourlyRateHistory', () => {
  const urlCalled = () => fetchMock.mock.calls[0][0] as string;

  test('reads every stored month, newest first, with the id token', async () => {
    respondWith(200, [
      {
        year: 2026,
        month: 10,
        hourlyRate: '98.07',
        productiveHours: '130.00',
        minimumHourlyRate: '81.72',
        calculatedAt: '2026-10-19T20:42:00.000Z',
      },
      {
        year: 2026,
        month: 3,
        hourlyRate: '85.15',
        productiveHours: '173.33',
        minimumHourlyRate: '70.96',
        calculatedAt: '2026-03-19T20:42:00.000Z',
      },
    ]);

    await expect(
      pricingService.getHourlyRateHistory(ID_TOKEN),
    ).resolves.toEqual([
      {
        month: { month: 10, year: 2026 },
        hourlyRate: 98.07,
        productiveHours: 130,
        minimumHourlyRate: 81.72,
        calculatedAt: '2026-10-19T20:42:00.000Z',
      },
      {
        month: { month: 3, year: 2026 },
        hourlyRate: 85.15,
        productiveHours: 173.33,
        minimumHourlyRate: 70.96,
        calculatedAt: '2026-03-19T20:42:00.000Z',
      },
    ]);

    expect(urlCalled()).toMatch(/\/pricing\/hourly-rate\/history$/);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${ID_TOKEN}`,
    );
  });

  test('answers an empty list while nothing was calculated', async () => {
    respondWith(200, []);

    await expect(
      pricingService.getHourlyRateHistory(ID_TOKEN),
    ).resolves.toEqual([]);
  });

  test('fails when the history cannot be read', async () => {
    respondWith(500, { code: 'INTERNAL_ERROR', message: 'Oops' });

    await expect(
      pricingService.getHourlyRateHistory(ID_TOKEN),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getHourlyRateHistoryMonth', () => {
  const OCTOBER = { month: 10, year: 2026 };
  const DETAIL = {
    month: 10,
    year: 2026,
    items: [
      { key: 'FIXED_COSTS', amount: '1399.08' },
      { key: 'VARIABLE_COSTS', amount: '1225.00' },
      { key: 'OWNER_DRAW', amount: '8000.00' },
      { key: 'SAFETY_MARGIN', amount: '2124.82' },
    ].map(item => ({ ...item, label: item.key, percentOfTotal: '0.00' })),
    total: '12748.90',
    productiveHours: '130.00',
    hourlyRate: '98.07',
    minimumHourlyRate: '81.72',
    calculatedAt: '2026-10-19T20:42:00.000Z',
    parameters: {
      monthlyIncomeGoal: '8000.00',
      weeklyHours: '30.00',
      safetyMarginPct: '20.00',
    },
  };

  test('reads the month as it was calculated, with the goals it used', async () => {
    respondWith(200, DETAIL);

    const rate = await pricingService.getHourlyRateHistoryMonth(
      ID_TOKEN,
      OCTOBER,
    );

    expect(rate).toMatchObject({
      month: OCTOBER,
      settings: {
        monthlyIncomeGoal: 8000,
        weeklyHours: 30,
        safetyMarginPct: 20,
      },
      parts: { fixedCosts: 1399.08, safetyMargin: 2124.82 },
      hourlyRate: 98.07,
      minimumHourlyRate: 81.72,
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/pricing\/hourly-rate\/history\/2026\/10$/,
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${ID_TOKEN}`,
    );
  });

  test('is null for a month with no stored calculation', async () => {
    respondWith(404, {
      code: 'HOURLY_RATE_SNAPSHOT_NOT_FOUND',
      message: 'This month has no stored hourly rate',
    });

    await expect(
      pricingService.getHourlyRateHistoryMonth(ID_TOKEN, OCTOBER),
    ).resolves.toBeNull();
  });

  test('fails on any other error', async () => {
    respondWith(404, { code: 'PRICING_SETTINGS_NOT_FOUND', message: 'No' });

    await expect(
      pricingService.getHourlyRateHistoryMonth(ID_TOKEN, OCTOBER),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('estimateProcedure', () => {
  const ESTIMATE_RESPONSE = {
    minimumPrice: '131.47',
    breakEvenPrice: '126.28',
    hoursCost: '57.12',
    tripCost: '49.35',
    suppliesCost: '25.00',
    hourlyRateUsed: '38.08',
    minimumHourlyRateUsed: '34.62',
    tripEstimateAvailable: true,
    tripEstimateDays: 2,
    suppliesWithoutCost: [],
    durationMinutes: 90,
    month: 11,
    year: 2026,
  };

  test('calls POST /pricing/procedure-estimate with token and payload', async () => {
    respondWith(200, ESTIMATE_RESPONSE);

    const dto = {
      durationMinutes: 90,
      clientId: 'client-1',
      supplies: [{ itemId: 'item-1', quantity: 2 }],
    };

    const response = await pricingService.estimateProcedure(ID_TOKEN, dto);

    expect(response).toEqual(ESTIMATE_RESPONSE);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/pricing\/procedure-estimate$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(dto);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${ID_TOKEN}`,
    );
  });

  test('rethrows 409 or 404 unconfigured errors as ApiError', async () => {
    respondWith(409, {
      code: 'PRICING_SETTINGS_NOT_FOUND',
      message: 'Configuração de honorários não encontrada',
    });

    const failure = pricingService.estimateProcedure(ID_TOKEN, {
      durationMinutes: 60,
    });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 409,
      code: 'PRICING_SETTINGS_NOT_FOUND',
    });
  });

  test('rethrows 400 validation error as ApiError', async () => {
    respondWith(400, {
      code: 'VALIDATION_ERROR',
      message: 'Duração deve ser um número inteiro',
    });

    const failure = pricingService.estimateProcedure(ID_TOKEN, {
      durationMinutes: 0,
    });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('isPricingUnconfiguredError', () => {
  test('identifies 409 ApiError as unconfigured', () => {
    const err = new ApiError('Conflict', null, 409);
    expect(isPricingUnconfiguredError(err)).toBe(true);
  });

  test('identifies PRICING_SETTINGS_NOT_FOUND code as unconfigured', () => {
    const err = new ApiError('Not found', 'PRICING_SETTINGS_NOT_FOUND', 404);
    expect(isPricingUnconfiguredError(err)).toBe(true);
  });

  test('returns false for generic errors or other status codes', () => {
    expect(isPricingUnconfiguredError(new Error('Network failure'))).toBe(
      false,
    );
    expect(
      isPricingUnconfiguredError(new ApiError('Bad request', null, 400)),
    ).toBe(false);
    expect(
      isPricingUnconfiguredError(new ApiError('Internal error', null, 500)),
    ).toBe(false);
  });
});
