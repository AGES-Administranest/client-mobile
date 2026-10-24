import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import { syncPendingClinics } from 'features/clients';
import { onConnectionRestored } from 'shared/services';

import {
  loadServiceInvoiceOutbox,
  subscribeOfflineServiceInvoices,
} from '../services/offlineServiceInvoiceStore';
import { syncPendingServiceInvoices } from '../services/serviceInvoiceSyncService';

// The app has no connectivity library, so the return of the network is noticed
// by trying: when the app opens, when it comes back from the background, when
// something enters the queue and, while anything is waiting, every 30 s. Where
// the platform reports it, the reconnection also triggers it.
const RETRY_INTERVAL_MS = 30_000;

/**
 * Sends the notes typed without a connection. It has no state to give back:
 * what the person sees of the queue is read by `usePendingServiceInvoices`.
 */
export function useServiceInvoiceSync(): void {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;

  const sync = useCallback(async () => {
    if (!idToken || !userId) return;
    // Takers first: a note in the queue can point at one registered offline
    // and only goes after it.
    await syncPendingClinics(idToken, userId);
    await syncPendingServiceInvoices(idToken, userId);
  }, [idToken, userId]);

  useEffect(() => {
    if (!idToken || !userId) return;

    // A sync that breaks (no network, the API down) is the expected case and
    // leaves the queue as it was; reading the queue is what reports a problem.
    const run = () => {
      sync().catch(() => undefined);
    };
    run();

    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });
    const unsubscribeQueue = subscribeOfflineServiceInvoices(run);
    const unsubscribeConnection = onConnectionRestored(run);
    const interval = setInterval(() => {
      loadServiceInvoiceOutbox(userId)
        .then(pending => {
          if (pending.some(invoice => !invoice.rejection)) run();
        })
        .catch(() => undefined);
    }, RETRY_INTERVAL_MS);

    return () => {
      appState.remove();
      unsubscribeQueue();
      unsubscribeConnection();
      clearInterval(interval);
    };
  }, [idToken, userId, sync]);
}
