import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';

import { useFinancialCategories } from './useFinancialCategories';
import type { FinancialCategory } from '../domain/financialEntry';
import { fetchFinancialCategories } from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  fetchFinancialCategories: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchFinancialCategories as jest.MockedFunction<
  typeof fetchFinancialCategories
>;

const SESSION: AuthSession = {
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

const TRAVEL: FinancialCategory = {
  id: 'cat-travel',
  name: 'Travel',
  nature: 'EXPENSE',
  defaultScope: 'PROFESSIONAL',
  isDefault: true,
};

const FOOD: FinancialCategory = {
  id: 'cat-food',
  name: 'Comida',
  nature: 'EXPENSE',
  defaultScope: 'PERSONAL',
  isDefault: false,
};

let current: ReturnType<typeof useFinancialCategories>;

function Probe() {
  current = useFinancialCategories();
  return null;
}

async function mount() {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue([TRAVEL]);
});

test('loads the categories with the id token', async () => {
  await mount();

  expect(fetchMock).toHaveBeenCalledWith('id-token');
  expect(current.status).toBe('ready');
  expect(current.categories).toEqual([TRAVEL]);
});

test('a failed load says why and can be reloaded', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await mount();
  expect(current.status).toBe('failed');
  expect(current.failure).toBe('financialEntries.form.failures.network');

  await act(async () => current.reload());

  expect(current.status).toBe('ready');
  expect(current.failure).toBeNull();
});

test('a created category joins the list once, even when added again', async () => {
  await mount();

  await act(async () => current.add(FOOD));
  await act(async () => current.add({ ...FOOD, name: 'Comida caseira' }));

  expect(current.categories).toEqual([
    TRAVEL,
    { ...FOOD, name: 'Comida caseira' },
  ]);
});
