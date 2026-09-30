import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingMovement } from '../domain/pendingMovement';

const QUEUE_KEY = '@administranest:stock:pending-movements';
const CURSOR_KEY = '@administranest:stock:sync-cursor';
const REJECTED_KEY = '@administranest:stock:rejected-movements';

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

async function loadMovements(
  base: string,
  userId: string,
): Promise<PendingMovement[]> {
  try {
    const raw = await AsyncStorage.getItem(stockStorageKey(base, userId));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isPendingMovement) : [];
  } catch {
    return [];
  }
}

export function loadPendingMovements(
  userId: string,
): Promise<PendingMovement[]> {
  return loadMovements(QUEUE_KEY, userId);
}

export function loadRejectedMovements(
  userId: string,
): Promise<PendingMovement[]> {
  return loadMovements(REJECTED_KEY, userId);
}

export async function addPendingMovement(
  userId: string,
  movement: PendingMovement,
): Promise<void> {
  if (!isPendingMovement(movement)) {
    throw new Error('Refusing to queue a stock movement the queue cannot read');
  }

  if (!(movement.quantity > 0) || !(movement.unitCost > 0)) {
    throw new Error(
      'Refusing to queue a stock movement the server would reject',
    );
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

/**
 * Tira da fila os movimentos que o servidor recusou de vez (payload inválido,
 * item que não existe mais) e os guarda à parte. Sem isso um único movimento
 * ruim derrubaria todo lote seguinte; guardá-los em vez de apagar deixa o
 * registro disponível para quem precisar corrigi-lo.
 */
export async function rejectPendingMovements(
  userId: string,
  movements: readonly PendingMovement[],
): Promise<void> {
  if (movements.length === 0) {
    return;
  }

  return serialize(async () => {
    const rejectedIds = new Set(movements.map(movement => movement.id));
    const remaining = (await loadPendingMovements(userId)).filter(
      movement => !rejectedIds.has(movement.id),
    );
    const rejected = await loadRejectedMovements(userId);

    await AsyncStorage.setItem(
      stockStorageKey(REJECTED_KEY, userId),
      JSON.stringify([...rejected, ...movements]),
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
