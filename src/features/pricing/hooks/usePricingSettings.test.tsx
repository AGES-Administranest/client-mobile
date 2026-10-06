import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { usePricingSettings } from './usePricingSettings';
import { fetchPricingSettings } from '../services/pricingSettingsService';

jest.mock('../services/pricingSettingsService', () => ({
  fetchPricingSettings: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchPricingSettings as jest.MockedFunction<
  typeof fetchPricingSettings
>;

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const SETTINGS = {
  monthlyNetIncomeGoal: 8000,
  weeklyAvailableHours: 40,
  safetyMarginPercent: 10,
};

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof usePricingSettings>,
  };

  function Harness() {
    result.current = usePricingSettings();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });
  return result;
}

beforeEach(() => {
  fetchMock.mockReset();
});

test('is unconfigured when the API has no settings for the account', async () => {
  fetchMock.mockResolvedValue(null);

  const result = await mountHook();

  expect(fetchMock).toHaveBeenCalledWith('id-token');
  expect(result.current.state).toEqual({ status: 'unconfigured' });
});

test('is configured, with the settings, once they exist', async () => {
  fetchMock.mockResolvedValue(SETTINGS);

  const result = await mountHook();

  expect(result.current.state).toEqual({
    status: 'configured',
    settings: SETTINGS,
  });
});

test('reports an error, not the onboarding, when the request fails', async () => {
  fetchMock.mockRejectedValue(new ApiError('boom', null, 500));

  const result = await mountHook();

  expect(result.current.state).toEqual({ status: 'error' });
});

test('reload asks again, so saving the form leaves the onboarding', async () => {
  fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(SETTINGS);
  const result = await mountHook();
  expect(result.current.state.status).toBe('unconfigured');

  await act(async () => {
    result.current.reload();
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.state.status).toBe('configured');
});
