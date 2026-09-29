import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import { onConnectionRestored } from 'shared/services';
import { ApiError } from 'shared/services/apiClient';

import { acceptedMovementIds, toSyncBatches } from '../domain/pendingMovement';
import {
  loadPendingMovements,
  loadSyncCursor,
  removePendingMovements,
  saveSyncCursor,
} from '../services/pendingMovementsRepository';
import {
  pullStockMovements,
  pushPendingMovements,
  SYNC_EPOCH,
  type ItemBalance,
} from '../services/stockSyncService';

const MAX_PULL_ROUNDS = 20;

export type SyncFailure = { code: string };

export type StockSyncState = {
  sync: () => Promise<void>;
  isSyncing: boolean;
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

export function useStockSync(): StockSyncState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;

  const [isSyncing, setIsSyncing] = useState(false);
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

      for (const batch of toSyncBatches(pending)) {
        const result = await pushPendingMovements(idToken, batch);
        const accepted = acceptedMovementIds(result);

        await removePendingMovements(userId, accepted);
        applied.push(...accepted);
        negatives.push(...result.needsAdjustment);
        lastBalances = result.balances;
      }

      let since = (await loadSyncCursor(userId)) ?? SYNC_EPOCH;

      for (let round = 0; round < MAX_PULL_ROUNDS; round += 1) {
        const result = await pullStockMovements(idToken, since);

        await saveSyncCursor(userId, result.cursor);
        since = result.cursor;
        lastBalances = result.balances.length ? result.balances : lastBalances;

        if (!result.hasMore) {
          break;
        }
      }

      if (isMounted.current) {
        setNeedsAdjustment(negatives);
        setBalances(lastBalances);
        setFailure(null);
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

  return { sync, isSyncing, pendingCount, needsAdjustment, balances, failure };
}
