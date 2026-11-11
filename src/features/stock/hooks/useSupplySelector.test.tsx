import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { apiClient } from 'shared/services/apiClient';

import { useSupplySelector } from './useSupplySelector';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn() },
}));

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const getMock = apiClient.get as jest.Mock;

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

const CATALOG = [
  {
    id: 'item-1',
    name: 'Cateter intravenoso 22G',
    unit: 'UNIT',
    currentQuantity: '55',
    defaultUnitCost: '3.2000',
  },
  {
    id: 'item-2',
    name: 'Propofol 1% 20 ml',
    unit: 'VIAL',
    currentQuantity: '14',
    defaultUnitCost: '38.9000',
  },
];

let current: ReturnType<typeof useSupplySelector>;

function Probe() {
  current = useSupplySelector();
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

async function waitForSearch() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  getMock.mockResolvedValue(CATALOG);
});

afterEach(() => {
  jest.useRealTimers();
});

test('lists the whole catalog when the search is empty', async () => {
  await mount();
  await waitForSearch();

  expect(current.options.map(option => option.id)).toEqual([
    'item-1',
    'item-2',
  ]);
});

test.each([
  ['an empty search', ''],
  ['a filtered search', 'Cat'],
])('lists the catalog again after reset following %s', async (_label, term) => {
  await mount();
  await waitForSearch();
  if (term) {
    await act(async () => current.onTermChange(term));
    await waitForSearch();
  }
  await act(async () => current.onSelect(current.options[0]));

  await act(async () => current.reset());
  await waitForSearch();

  expect(current.term).toBe('');
  expect(current.selected).toBeNull();
  expect(current.options.map(option => option.id)).toEqual([
    'item-1',
    'item-2',
  ]);
  expect(getMock.mock.calls.at(-1)?.[0]).toContain('search=&');
});
