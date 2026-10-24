import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';

import type { TripSyncRejection } from '../domain/offlineTrips';
import {
  loadTripOutbox,
  loadTripRejections,
  saveTripRejections,
  subscribeOfflineTrips,
} from '../services/offlineTripStore';
import { syncPendingTrips } from '../services/tripSyncService';

const RETRY_INTERVAL_MS = 30_000;

export type TripSyncState = {
  rejection: TripSyncRejection | null;
  dismissRejection: () => void;
  syncNow: () => Promise<void>;
};

export function useTripSync(): TripSyncState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;

  const [rejections, setRejections] = useState<TripSyncRejection[]>([]);

  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (!idToken || !userId || syncing.current) return;
    syncing.current = true;
    try {
      await syncPendingTrips(idToken, userId);
    } finally {
      syncing.current = false;
      setRejections(await loadTripRejections(userId));
    }
  }, [idToken, userId]);

  useEffect(() => {
    if (!idToken || !userId) {
      setRejections([]);
      return;
    }

    const run = () => {
      sync().catch(() => {});
    };
    run();

    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });

    const unsubscribeTrips = subscribeOfflineTrips(run);

    const interval = setInterval(() => {
      loadTripOutbox(userId).then(outbox => {
        if (outbox.length > 0) run();
      });
    }, RETRY_INTERVAL_MS);

    return () => {
      appState.remove();
      unsubscribeTrips();
      clearInterval(interval);
    };
  }, [idToken, userId, sync]);

  const dismissRejection = useCallback(() => {
    if (!userId) return;
    const rest = rejections.slice(1);
    setRejections(rest);
    saveTripRejections(userId, rest).catch(() => {});
  }, [rejections, userId]);

  const rejection: TripSyncRejection | null = rejections[0] ?? null;

  return {
    rejection,
    dismissRejection,
    syncNow: sync,
  };
}
