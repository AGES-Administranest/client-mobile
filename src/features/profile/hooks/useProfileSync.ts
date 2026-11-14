import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import { onConnectionRestored } from 'shared/services/network';

import { loadPendingProfileEdit } from '../services/profileCache';
import { syncPendingProfile } from '../services/profileSyncService';

const RETRY_INTERVAL_MS = 30_000;

export function useProfileSync(): void {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;

  useEffect(() => {
    if (!idToken || !userId) return;

    const run = () => {
      syncPendingProfile(idToken, userId).catch(() => {});
    };
    run();

    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });
    const stopConnection = onConnectionRestored(run);
    const interval = setInterval(() => {
      loadPendingProfileEdit(userId).then(pending => {
        if (pending) run();
      });
    }, RETRY_INTERVAL_MS);

    return () => {
      appState.remove();
      stopConnection();
      clearInterval(interval);
    };
  }, [idToken, userId]);
}
