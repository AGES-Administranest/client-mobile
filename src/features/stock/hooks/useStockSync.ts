import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import { onConnectionRestored } from 'shared/services';
import { ApiError } from 'shared/services/apiClient';

import {
  acceptedMovementIds,
  toSyncBatches,
  type PendingMovement,
} from '../domain/pendingMovement';
import {
  loadPendingMovements,
  loadSyncCursor,
  rejectPendingMovements,
  removePendingMovements,
  saveSyncCursor,
} from '../services/pendingMovementsRepository';
import {
  pullStockMovements,
  pushPendingMovements,
  SYNC_EPOCH,
  type ItemBalance,
  type PushResult,
} from '../services/stockSyncService';

const MAX_PULL_ROUNDS = 20;

export type SyncFailure = { code: string };

export type StockSyncState = {
  sync: () => Promise<void>;
  isSyncing: boolean;
  syncedAt: number | null;
  pendingCount: number;
  needsAdjustment: string[];
  balances: ItemBalance[];
  failure: SyncFailure | null;
};

function toFailure(error: unknown): SyncFailure {
  return {
    code: error instanceof ApiError ? error.code ?? 'UNKNOWN' : 'OFFLINE',
  };
}

// Erros que reenviar não resolve: o servidor recusou o conteúdo. Sessão
// expirada (401/403) e limites (408/429) passam, e a fila espera a próxima.
function isPermanentRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

// O servidor valida o lote inteiro antes de aplicar: um movimento inválido
// recusa todos. Quando isso acontece, reenvia um a um para que o resto passe
// e só o culpado seja posto de lado.
async function pushIsolatingRejections(
  idToken: string,
  userId: string,
  batch: readonly PendingMovement[],
): Promise<PushResult> {
  try {
    return await pushPendingMovements(idToken, batch);
  } catch (error) {
    if (!isPermanentRejection(error)) {
      throw error;
    }

    if (batch.length === 1) {
      await rejectPendingMovements(userId, batch);
      return { applied: [], duplicated: [], balances: [], needsAdjustment: [] };
    }
  }

  const merged: PushResult = {
    applied: [],
    duplicated: [],
    balances: [],
    needsAdjustment: [],
  };
  const rejected: PendingMovement[] = [];

  for (const movement of batch) {
    try {
      const result = await pushPendingMovements(idToken, [movement]);

      merged.applied.push(...result.applied);
      merged.duplicated.push(...result.duplicated);
      merged.balances.push(...result.balances);
      merged.needsAdjustment.push(...result.needsAdjustment);
    } catch (error) {
      if (!isPermanentRejection(error)) {
        await rejectPendingMovements(userId, rejected);
        throw error;
      }

      rejected.push(movement);
    }
  }

  await rejectPendingMovements(userId, rejected);

  return merged;
}

export function useStockSync(): StockSyncState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [needsAdjustment, setNeedsAdjustment] = useState<string[]>([]);
  const [balances, setBalances] = useState<ItemBalance[]>([]);
  const [failure, setFailure] = useState<SyncFailure | null>(null);

  const isMounted = useRef(true);
  const isRunning = useRef(false);
  const rerunRequested = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const runOnce = useCallback(async () => {
    if (!idToken || !userId) {
      return;
    }

    if (isMounted.current) setIsSyncing(true);

    try {
      const pending = await loadPendingMovements(userId);
      const applied: string[] = [];
      const negatives: string[] = [];
      let lastBalances: ItemBalance[] = [];
      let changed = false;

      for (const batch of toSyncBatches(pending)) {
        const result = await pushIsolatingRejections(idToken, userId, batch);
        const accepted = acceptedMovementIds(result);

        await removePendingMovements(userId, accepted);
        applied.push(...accepted);
        changed = changed || accepted.length > 0;
        negatives.push(...result.needsAdjustment);
        lastBalances = result.balances;
      }

      let since = (await loadSyncCursor(userId)) ?? SYNC_EPOCH;
      let afterId: string | null = null;

      for (let round = 0; round < MAX_PULL_ROUNDS; round += 1) {
        const result = await pullStockMovements(idToken, since, afterId);

        await saveSyncCursor(userId, result.cursor);
        since = result.cursor;
        afterId = result.afterId;
        lastBalances = result.balances.length ? result.balances : lastBalances;
        changed = changed || result.movements.length > 0;

        if (!result.hasMore) {
          break;
        }
      }

      if (isMounted.current) {
        setNeedsAdjustment(negatives);
        setBalances(lastBalances);
        setFailure(null);

        if (changed) {
          setSyncedAt(Date.now());
        }
      }
    } catch (error) {
      if (isMounted.current) setFailure(toFailure(error));
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
        setPendingCount((await loadPendingMovements(userId)).length);
      }
    }
  }, [idToken, userId]);

  const sync = useCallback(async () => {
    if (!idToken || !userId) {
      return;
    }

    if (isRunning.current) {
      rerunRequested.current = true;
      return;
    }

    isRunning.current = true;

    try {
      do {
        rerunRequested.current = false;
        await runOnce();
      } while (rerunRequested.current);
    } finally {
      isRunning.current = false;
    }
  }, [idToken, userId, runOnce]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sync();
      }
    });

    return () => subscription.remove();
  }, [sync]);

  useEffect(
    () =>
      onConnectionRestored(() => {
        sync();
      }),
    [sync],
  );

  return {
    sync,
    isSyncing,
    syncedAt,
    pendingCount,
    needsAdjustment,
    balances,
    failure,
  };
}
