import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useStockSync } from './useStockSync';
import type { PendingMovement } from '../domain/pendingMovement';
import {
  addPendingMovement,
  loadPendingMovements,
  loadRejectedMovements,
  loadSyncCursor,
} from '../services/pendingMovementsRepository';
import {
  pullStockMovements,
  pushPendingMovements,
} from '../services/stockSyncService';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

jest.mock('../services/stockSyncService', () => ({
  ...jest.requireActual('../services/stockSyncService'),
  pushPendingMovements: jest.fn(),
  pullStockMovements: jest.fn(),
}));

let reconnect: () => void = () => undefined;

jest.mock('shared/services', () => ({
  onConnectionRestored: jest.fn((listener: () => void) => {
    reconnect = listener;
    return () => undefined;
  }),
}));

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const pushMock = pushPendingMovements as jest.MockedFunction<
  typeof pushPendingMovements
>;
const pullMock = pullStockMovements as jest.MockedFunction<
  typeof pullStockMovements
>;

const USER = 'user-1';
const ID_TOKEN = 'id-token';

const SESSION = {
  idToken: ID_TOKEN,
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: USER,
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

function pending(id: string): PendingMovement {
  return {
    id,
    itemId: 'item-1',
    itemName: 'Gaze estéril',
    unit: 'box',
    type: 'outbound',
    source: 'manualAdjustment',
    adjustmentReason: 'loss',
    quantity: 2,
    unitCost: 10,
    occurredAt: '2026-09-10T08:00:00.000Z',
    notes: null,
  };
}

function balance(currentQuantity: string) {
  return {
    itemId: 'item-1',
    itemName: 'Gaze estéril',
    currentQuantity: Number(currentQuantity),
    needsAdjustment: false,
  };
}

function emptyPull(cursor = 'cursor-1', hasMore = false) {
  return { movements: [], balances: [], cursor, hasMore };
}

let current: ReturnType<typeof useStockSync>;

function Probe() {
  current = useStockSync();
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
  mockStorage.clear();
  pushMock.mockReset();
  pullMock.mockReset().mockResolvedValue(emptyPull());
});

it('does not call the sync route when there is nothing queued', async () => {
  await mount();

  expect(pushMock).not.toHaveBeenCalled();
});

it('still pulls what other devices did when the queue is empty', async () => {
  await mount();

  expect(pullMock).toHaveBeenCalledWith(ID_TOKEN, '1970-01-01T00:00:00.000Z');
});

it('clears both what was applied and what came back as already there', async () => {
  await addPendingMovement(USER, pending('a'));
  await addPendingMovement(USER, pending('b'));
  await addPendingMovement(USER, pending('c'));

  pushMock.mockResolvedValue({
    applied: [{ id: 'a' } as never],
    duplicated: ['b'],
    balances: [],
    needsAdjustment: [],
  });

  await mount();

  expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual(['c']);
});

it('keeps the queue intact when the network is down', async () => {
  await addPendingMovement(USER, pending('a'));
  pushMock.mockRejectedValue(new Error('network down'));

  await mount();

  expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual(['a']);
  expect(current.failure).toEqual({ code: 'OFFLINE' });
});

it('keeps the queue when the token expired, so nothing is lost', async () => {
  const { ApiError } = jest.requireActual('shared/services/apiClient');

  await addPendingMovement(USER, pending('a'));
  pushMock.mockRejectedValue(new ApiError('expired', 'TOKEN_EXPIRED', 401));

  await mount();

  expect(await loadPendingMovements(USER)).toHaveLength(1);
  expect(current.failure).toEqual({ code: 'TOKEN_EXPIRED' });
});

describe('a movement the server refuses for good', () => {
  const { ApiError } = jest.requireActual('shared/services/apiClient');

  function accepted(id: string) {
    return {
      applied: [{ id } as never],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    };
  }

  it('is set aside so the rest of the batch still goes through', async () => {
    await addPendingMovement(USER, pending('a'));
    await addPendingMovement(USER, pending('b'));
    await addPendingMovement(USER, pending('c'));

    pushMock
      .mockRejectedValueOnce(new ApiError('invalid', 'VALIDATION_ERROR', 400))
      .mockResolvedValueOnce(accepted('a'))
      .mockRejectedValueOnce(new ApiError('invalid', 'VALIDATION_ERROR', 400))
      .mockResolvedValueOnce(accepted('c'));

    await mount();

    expect(pushMock.mock.calls.map(call => call[1].map(m => m.id))).toEqual([
      ['a', 'b', 'c'],
      ['a'],
      ['b'],
      ['c'],
    ]);
    expect(await loadPendingMovements(USER)).toEqual([]);
    expect((await loadRejectedMovements(USER)).map(m => m.id)).toEqual(['b']);
    expect(current.failure).toBeNull();
  });

  it('stops blocking the queue on the next sync', async () => {
    await addPendingMovement(USER, pending('a'));

    pushMock.mockRejectedValueOnce(
      new ApiError('item not found', 'ITEM_NOT_FOUND', 404),
    );

    await mount();

    expect(await loadPendingMovements(USER)).toEqual([]);
    expect((await loadRejectedMovements(USER)).map(m => m.id)).toEqual(['a']);

    await addPendingMovement(USER, pending('b'));
    pushMock.mockResolvedValueOnce(accepted('b'));

    await act(async () => {
      await current.sync();
    });

    expect(pushMock.mock.calls[1][1].map(m => m.id)).toEqual(['b']);
    expect(await loadPendingMovements(USER)).toEqual([]);
  });

  it('keeps the queue when the connection drops while isolating', async () => {
    await addPendingMovement(USER, pending('a'));
    await addPendingMovement(USER, pending('b'));

    pushMock
      .mockRejectedValueOnce(new ApiError('invalid', 'VALIDATION_ERROR', 400))
      .mockRejectedValueOnce(new Error('network down'));

    await mount();

    expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual([
      'a',
      'b',
    ]);
    expect(await loadRejectedMovements(USER)).toEqual([]);
    expect(current.failure).toEqual({ code: 'OFFLINE' });
  });
});

it('splits a queue larger than the batch limit into several calls', async () => {
  for (let index = 0; index < 201; index += 1) {
    await addPendingMovement(USER, pending(`movement-${index}`));
  }

  pushMock.mockResolvedValue({
    applied: [],
    duplicated: [],
    balances: [],
    needsAdjustment: [],
  });

  await mount();

  expect(pushMock).toHaveBeenCalledTimes(2);
  expect(pushMock.mock.calls[0][1]).toHaveLength(200);
  expect(pushMock.mock.calls[1][1]).toHaveLength(1);
});

it('keeps pulling while the server says there is more', async () => {
  pullMock
    .mockResolvedValueOnce(emptyPull('cursor-1', true))
    .mockResolvedValueOnce(emptyPull('cursor-2', true))
    .mockResolvedValueOnce(emptyPull('cursor-3', false));

  await mount();

  expect(pullMock).toHaveBeenCalledTimes(3);
  expect(pullMock.mock.calls[1][1]).toBe('cursor-1');
  expect(pullMock.mock.calls[2][1]).toBe('cursor-2');
  expect(await loadSyncCursor(USER)).toBe('cursor-3');
});

it('reports the items that went negative without calling it a failure', async () => {
  await addPendingMovement(USER, pending('a'));

  pushMock.mockResolvedValue({
    applied: [{ id: 'a' } as never],
    duplicated: [],
    balances: [balance('-2')],
    needsAdjustment: ['item-1'],
  });

  await mount();

  expect(current.needsAdjustment).toEqual(['item-1']);
  expect(current.failure).toBeNull();
});

it('is harmless to resend a batch the server had already accepted', async () => {
  await addPendingMovement(USER, pending('a'));

  pushMock.mockRejectedValueOnce(new Error('connection dropped after commit'));

  await mount();

  expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual(['a']);

  pushMock.mockResolvedValue({
    applied: [],
    duplicated: ['a'],
    balances: [balance('15')],
    needsAdjustment: [],
  });

  await act(async () => {
    await current.sync();
  });

  expect(pushMock.mock.calls[1][1].map(m => m.id)).toEqual(['a']);
  expect(await loadPendingMovements(USER)).toEqual([]);
  expect(current.balances).toEqual([balance('15')]);
  expect(current.failure).toBeNull();
});

it('never pushes two batches in parallel, and honours a sync asked mid-flight', async () => {
  await addPendingMovement(USER, pending('a'));

  const releases: Array<() => void> = [];
  pushMock.mockImplementation(
    () =>
      new Promise(resolve => {
        releases.push(() =>
          resolve({
            applied: [],
            duplicated: [],
            balances: [],
            needsAdjustment: [],
          }),
        );
      }),
  );

  await mount();

  expect(pushMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    current.sync();
    current.sync();
  });

  expect(pushMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    releases[0]();
  });

  expect(pushMock).toHaveBeenCalledTimes(2);

  await act(async () => {
    releases[1]?.();
  });
});

it('sends the queue on its own when the connection comes back', async () => {
  pushMock.mockResolvedValue({
    applied: [],
    duplicated: [],
    balances: [],
    needsAdjustment: [],
  });

  await mount();

  await addPendingMovement(USER, pending('a'));
  expect(pushMock).not.toHaveBeenCalled();

  await act(async () => {
    reconnect();
  });

  expect(pushMock).toHaveBeenCalledTimes(1);
  expect(pushMock.mock.calls[0][1].map(m => m.id)).toEqual(['a']);
});

describe('syncedAt', () => {
  it('stays null when the sync had nothing to change', async () => {
    await mount();

    expect(current.syncedAt).toBeNull();
  });

  it('is stamped once the queue is drained, so the history can refresh', async () => {
    await addPendingMovement(USER, pending('a'));

    pushMock.mockResolvedValue({
      applied: [{ id: 'a' } as never],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    });

    await mount();

    expect(current.syncedAt).not.toBeNull();
  });

  it('is stamped when another device sent movements over', async () => {
    pullMock.mockResolvedValue({
      movements: [{ id: 'remote-1' } as never],
      balances: [],
      cursor: 'cursor-1',
      hasMore: false,
    });

    await mount();

    expect(current.syncedAt).not.toBeNull();
  });
});
