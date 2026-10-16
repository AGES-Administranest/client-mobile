import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useDeleteEntry, type DeleteEntryOutcome } from './useDeleteEntry';
import type { FinancialEntry } from '../domain/financialEntry';
import { deleteFinancialEntry } from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  deleteFinancialEntry: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const deleteMock = deleteFinancialEntry as jest.MockedFunction<
  typeof deleteFinancialEntry
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

const ENTRY: FinancialEntry = {
  id: 'entry-1',
  nature: 'EXPENSE',
  description: 'Combustível',
  category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
  scope: 'PROFESSIONAL',
  amount: 180,
  accrualDate: '2026-08-09T12:00:00.000Z',
  source: 'MANUAL',
  origin: { type: 'MANUAL', id: null },
};

let current: ReturnType<typeof useDeleteEntry>;

function Probe() {
  current = useDeleteEntry();
  return null;
}

async function mount(session: AuthSession | null = SESSION) {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Probe />
      </AuthProvider>,
    );
  });
}

async function remove() {
  let outcome: DeleteEntryOutcome | null = null;
  await act(async () => {
    outcome = await current.remove(ENTRY);
  });
  return outcome;
}

beforeEach(() => {
  deleteMock.mockReset().mockResolvedValue(undefined);
});

it('deletes the entry with the id token', async () => {
  await mount();

  await expect(remove()).resolves.toBe('deleted');

  expect(deleteMock).toHaveBeenCalledWith('id-token', 'entry-1');
  expect(current.isDeleting).toBe(false);
  expect(current.failure).toBeNull();
});

it('counts an entry that is already gone as deleted', async () => {
  deleteMock.mockRejectedValue(
    new ApiError('Not found', 'FINANCIAL_ENTRY_NOT_FOUND', 404),
  );
  await mount();

  await expect(remove()).resolves.toBe('deleted');
  expect(current.failure).toBeNull();
});

it('reports an automatic entry, which only leaves with its origin', async () => {
  deleteMock.mockRejectedValue(
    new ApiError('Via origin', 'FINANCIAL_ENTRY_DELETE_VIA_ORIGIN', 409),
  );
  await mount();

  await expect(remove()).resolves.toBe('viaOrigin');
  expect(current.failure).toBeNull();
});

it.each([
  [
    new TypeError('Network request failed'),
    'financialEntries.form.failures.network',
  ],
  [
    new ApiError('Boom', 'INTERNAL_ERROR', 500),
    'financialEntries.detail.failures.delete',
  ],
])('keeps the entry and explains %p', async (error, key) => {
  deleteMock.mockRejectedValue(error);
  await mount();

  await expect(remove()).resolves.toBe('failed');
  expect(current.failure).toBe(key);
  expect(current.isDeleting).toBe(false);

  await act(async () => current.reset());
  expect(current.failure).toBeNull();
});

it('two taps before the answer send a single request', async () => {
  let finish: () => void = () => undefined;
  deleteMock.mockImplementation(
    () => new Promise<void>(resolve => (finish = resolve)),
  );
  await mount();

  let first: Promise<DeleteEntryOutcome> | null = null;
  let second: DeleteEntryOutcome | null = null;
  await act(async () => {
    first = current.remove(ENTRY);
    second = await current.remove(ENTRY);
  });
  expect(current.isDeleting).toBe(true);
  await act(async () => {
    finish();
    await first;
  });

  expect(second).toBe('busy');
  expect(deleteMock).toHaveBeenCalledTimes(1);
  expect(current.isDeleting).toBe(false);
});

it('without a session nothing reaches the API and it asks to sign in again', async () => {
  await mount(null);

  await expect(remove()).resolves.toBe('failed');
  expect(deleteMock).not.toHaveBeenCalled();
  expect(current.failure).toBe('financialEntries.form.failures.session');
});
