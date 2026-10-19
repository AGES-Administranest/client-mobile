import { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useFinancialStatement } from './useFinancialStatement';
import type { FinancialEntry } from '../domain/financialEntry';
import {
  STATEMENT_PAGE_SIZE,
  type StatementFilters,
  type StatementScope,
} from '../domain/statement';
import { fetchFinancialEntries } from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  fetchFinancialEntries: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchEntriesMock = fetchFinancialEntries as jest.MockedFunction<
  typeof fetchFinancialEntries
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

const AUGUST: StatementFilters = {
  period: { month: 8, year: 2026 },
  scope: 'all',
};

function entry(id: string): FinancialEntry {
  return {
    id,
    nature: 'EXPENSE',
    description: id,
    category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
    scope: 'PROFESSIONAL',
    amount: 180,
    accrualDate: '2026-08-09T12:00:00.000Z',
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
  };
}

function page(prefix: string, length = STATEMENT_PAGE_SIZE): FinancialEntry[] {
  return Array.from({ length }, (_, i) => entry(`${prefix}-${i}`));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let current: ReturnType<typeof useFinancialStatement>;
let setScope: (scope: StatementScope) => void;

function Probe({ filters }: { filters: StatementFilters }) {
  const [scope, changeScope] = useState(filters.scope);
  setScope = changeScope;
  current = useFinancialStatement({ ...filters, scope });
  return null;
}

async function mount(filters: StatementFilters = AUGUST) {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe filters={filters} />
      </AuthProvider>,
    );
  });
}

const ids = () => current.entries.map(e => e.id);

beforeEach(() => {
  fetchEntriesMock.mockReset();
});

test('loads the first page of the month and knows it is the last one', async () => {
  fetchEntriesMock.mockResolvedValue([entry('a'), entry('b')]);

  await mount();

  expect(fetchEntriesMock).toHaveBeenCalledWith('id-token', AUGUST, 1);
  expect(current.status).toBe('ready');
  expect(ids()).toEqual(['a', 'b']);
  expect(current.hasMore).toBe(false);
});

test('starts in loading, with nothing to show', async () => {
  const first = deferred<FinancialEntry[]>();
  fetchEntriesMock.mockReturnValue(first.promise);

  await mount();

  expect(current.status).toBe('loading');
  expect(current.entries).toEqual([]);

  await act(async () => first.resolve([entry('a')]));

  expect(current.status).toBe('ready');
});

test('a full page means there may be more; loadMore appends the next page', async () => {
  fetchEntriesMock
    .mockResolvedValueOnce(page('p1'))
    .mockResolvedValueOnce([entry('p1-49'), entry('p2-0')]);

  await mount();

  expect(current.hasMore).toBe(true);

  await act(async () => current.loadMore());

  expect(fetchEntriesMock).toHaveBeenLastCalledWith('id-token', AUGUST, 2);
  expect(ids()).toHaveLength(STATEMENT_PAGE_SIZE + 1);
  expect(ids()).toContain('p2-0');
  expect(current.hasMore).toBe(false);
  expect(current.isLoadingMore).toBe(false);
});

test('loadMore does nothing on the last page, and only once while a page is on its way', async () => {
  const second = deferred<FinancialEntry[]>();
  fetchEntriesMock
    .mockResolvedValueOnce(page('p1'))
    .mockReturnValueOnce(second.promise);

  await mount();
  await act(async () => {
    current.loadMore();
    current.loadMore();
  });

  expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
  expect(current.isLoadingMore).toBe(true);

  await act(async () => second.resolve([entry('p2-0')]));
  await act(async () => current.loadMore());

  expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
});

test('a failed next page keeps the list and waits for a retry instead of asking again on every scroll', async () => {
  fetchEntriesMock
    .mockResolvedValueOnce(page('p1'))
    .mockRejectedValueOnce(new ApiError('down', null, 500))
    .mockResolvedValueOnce([entry('p2-0')]);

  await mount();
  await act(async () => current.loadMore());

  expect(ids()).toHaveLength(STATEMENT_PAGE_SIZE);
  expect(current.status).toBe('ready');
  expect(current.loadMoreFailed).toBe(true);

  await act(async () => current.loadMore());
  await act(async () => current.loadMore());
  expect(fetchEntriesMock).toHaveBeenCalledTimes(2);

  await act(async () => current.retryLoadMore());

  expect(fetchEntriesMock).toHaveBeenCalledTimes(3);
  expect(ids()).toContain('p2-0');
  expect(current.loadMoreFailed).toBe(false);
});

test('changing the scope loads page 1 again and ignores the late answer of the old filter', async () => {
  const all = deferred<FinancialEntry[]>();
  fetchEntriesMock
    .mockReturnValueOnce(all.promise)
    .mockResolvedValueOnce([entry('personal-1')]);

  await mount();
  await act(async () => setScope('PERSONAL'));

  expect(fetchEntriesMock).toHaveBeenLastCalledWith(
    'id-token',
    { ...AUGUST, scope: 'PERSONAL' },
    1,
  );
  expect(ids()).toEqual(['personal-1']);

  await act(async () => all.resolve([entry('all-1'), entry('all-2')]));

  expect(ids()).toEqual(['personal-1']);
});

test.each([
  ['without connection', new TypeError('Network request failed'), 'network'],
  [
    'with an expired session',
    new ApiError('x', 'TOKEN_EXPIRED', 401),
    'session',
  ],
  ['with any other error', new ApiError('x', null, 500), 'unknown'],
])('%s the statement fails and says why', async (_, error, key) => {
  fetchEntriesMock.mockRejectedValue(error);

  await mount();

  expect(current.status).toBe('failed');
  expect(current.failure).toBe(`financialEntries.statement.failures.${key}`);
  expect(current.entries).toEqual([]);
  expect(current.hasMore).toBe(false);
});

test('reload fetches page 1 again after a failure', async () => {
  fetchEntriesMock
    .mockRejectedValueOnce(new ApiError('x', null, 500))
    .mockResolvedValueOnce([entry('a')]);

  await mount();
  await act(async () => current.reload());

  expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
  expect(current.status).toBe('ready');
  expect(current.failure).toBeNull();
  expect(ids()).toEqual(['a']);
});

test('without a session the statement fails as an expired session', async () => {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={null} initialAccount={null}>
        <Probe filters={AUGUST} />
      </AuthProvider>,
    );
  });

  expect(fetchEntriesMock).not.toHaveBeenCalled();
  expect(current.status).toBe('failed');
  expect(current.failure).toBe('financialEntries.statement.failures.session');
});
