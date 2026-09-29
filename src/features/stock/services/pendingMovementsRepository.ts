import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingMovement } from '../domain/pendingMovement';

const QUEUE_KEY = '@administranest:stock:pending-movements';
const CURSOR_KEY = '@administranest:stock:sync-cursor';

function stockStorageKey(base: string, userId: string): string {
  return `${base}:${encodeURIComponent(userId)}`;
}

function isPendingMovement(value: unknown): value is PendingMovement {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.itemId === 'string' &&
    typeof candidate.itemName === 'string' &&
    typeof candidate.unit === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.quantity === 'number' &&
    typeof candidate.unitCost === 'number' &&
    typeof candidate.occurredAt === 'string'
  );
}

let writes: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = writes.then(operation, operation);

  writes = result.catch(() => undefined);

  return result;
}

export async function loadPendingMovements(
  userId: string,
): Promise<PendingMovement[]> {
  try {
    const raw = await AsyncStorage.getItem(stockStorageKey(QUEUE_KEY, userId));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isPendingMovement) : [];
  } catch {
    return [];
  }
}

export async function addPendingMovement(
  userId: string,
  movement: PendingMovement,
): Promise<void> {
  if (!isPendingMovement(movement)) {
    throw new Error('Refusing to queue a stock movement the queue cannot read');
  }

  return serialize(async () => {
    const current = await loadPendingMovements(userId);

    await AsyncStorage.setItem(
      stockStorageKey(QUEUE_KEY, userId),
      JSON.stringify([...current, movement]),
    );
  });
}

export async function removePendingMovements(
  userId: string,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  return serialize(async () => {
    const accepted = new Set(ids);
    const remaining = (await loadPendingMovements(userId)).filter(
      movement => !accepted.has(movement.id),
    );

    await AsyncStorage.setItem(
      stockStorageKey(QUEUE_KEY, userId),
      JSON.stringify(remaining),
    );
  });
}

export async function loadSyncCursor(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(stockStorageKey(CURSOR_KEY, userId));
  } catch {
    return null;
  }
}

export async function saveSyncCursor(
  userId: string,
  cursor: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(stockStorageKey(CURSOR_KEY, userId), cursor);
  } catch {}
}
