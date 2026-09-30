import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addPendingMovement,
  loadPendingMovements,
  loadSyncCursor,
  removePendingMovements,
  saveSyncCursor,
} from './pendingMovementsRepository';
import type { PendingMovement } from '../domain/pendingMovement';

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

const USER = 'user-1';
const OTHER_USER = 'user-2';
const QUEUE_KEY = `@administranest:stock:pending-movements:${USER}`;

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

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
});

describe('the queue', () => {
  it('starts empty', async () => {
    expect(await loadPendingMovements(USER)).toEqual([]);
  });

  it('keeps what was added, in the order it was added', async () => {
    await addPendingMovement(USER, pending('a'));
    await addPendingMovement(USER, pending('b'));

    expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('removes only the ids it was told to remove', async () => {
    await addPendingMovement(USER, pending('a'));
    await addPendingMovement(USER, pending('b'));
    await addPendingMovement(USER, pending('c'));

    await removePendingMovements(USER, ['a', 'c']);

    expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual(['b']);
  });

  it('does not touch the storage when there is nothing to remove', async () => {
    await removePendingMovements(USER, []);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps one account out of another account queue', async () => {
    await addPendingMovement(USER, pending('a'));

    expect(await loadPendingMovements(OTHER_USER)).toEqual([]);
  });

  it('keeps both movements when two are saved at the same time', async () => {
    await Promise.all([
      addPendingMovement(USER, pending('a')),
      addPendingMovement(USER, pending('b')),
    ]);

    expect((await loadPendingMovements(USER)).map(m => m.id).sort()).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('a damaged queue', () => {
  it('survives JSON that does not parse', async () => {
    mockStorage.set(QUEUE_KEY, '{not json');

    expect(await loadPendingMovements(USER)).toEqual([]);
  });

  it('survives a stored value that is not a list', async () => {
    mockStorage.set(QUEUE_KEY, '{"nope":true}');

    expect(await loadPendingMovements(USER)).toEqual([]);
  });

  it('drops only the unreadable entries and keeps the rest', async () => {
    mockStorage.set(
      QUEUE_KEY,
      JSON.stringify([pending('a'), { id: 'broken' }, null, pending('b')]),
    );

    expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('a storage that refuses to write', () => {
  it('reports the failure instead of swallowing it', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );

    await expect(addPendingMovement(USER, pending('a'))).rejects.toThrow(
      'disk full',
    );
  });

  it('does not block the next write', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );

    await addPendingMovement(USER, pending('a')).catch(() => undefined);
    await addPendingMovement(USER, pending('b'));

    expect((await loadPendingMovements(USER)).map(m => m.id)).toEqual(['b']);
  });
});

describe('the sync cursor', () => {
  it('has none before the first sync', async () => {
    expect(await loadSyncCursor(USER)).toBeNull();
  });

  it('remembers the last cursor, per account', async () => {
    await saveSyncCursor(USER, '2026-09-26T13:45:02.118Z');

    expect(await loadSyncCursor(USER)).toBe('2026-09-26T13:45:02.118Z');
    expect(await loadSyncCursor(OTHER_USER)).toBeNull();
  });

  it('does not break the sync when it cannot be written', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );

    await expect(saveSyncCursor(USER, 'cursor')).resolves.toBeUndefined();
  });
});

describe('a record the queue could not read back', () => {
  it('is refused on the way in instead of vanishing on the way out', async () => {
    const broken = {
      ...pending('a'),
      id: undefined,
    } as unknown as PendingMovement;

    await expect(addPendingMovement(USER, broken)).rejects.toThrow();
    expect(await loadPendingMovements(USER)).toEqual([]);
  });
});
