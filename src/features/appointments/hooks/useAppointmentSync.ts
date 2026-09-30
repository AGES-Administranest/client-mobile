import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';

import type { SyncRejection } from '../domain/offlineAppointments';
import { syncPendingAppointments } from '../services/appointmentSyncService';
import {
  loadOutbox,
  loadRejections,
  saveRejections,
  subscribeOfflineAppointments,
} from '../services/offlineAppointmentStore';

// Sem biblioteca de conectividade no app, a volta da rede é percebida
// tentando: ao abrir o app, ao voltar do segundo plano, quando algo entra na
// fila e, enquanto houver pendências, a cada 30 s.
const RETRY_INTERVAL_MS = 30_000;

export type AppointmentSyncState = {
  /** O primeiro agendamento que o backend recusou, para avisar o usuário. */
  rejection: SyncRejection | null;
  dismissRejection: () => void;
};

export function useAppointmentSync(): AppointmentSyncState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [rejections, setRejections] = useState<SyncRejection[]>([]);

  const sync = useCallback(async () => {
    if (!idToken || !userId) return;
    try {
      await syncPendingAppointments(idToken, userId);
    } finally {
      setRejections(await loadRejections(userId));
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
    const unsubscribe = subscribeOfflineAppointments(run);
    const interval = setInterval(() => {
      loadOutbox(userId).then(queue => {
        if (queue.length > 0) run();
      });
    }, RETRY_INTERVAL_MS);

    return () => {
      appState.remove();
      unsubscribe();
      clearInterval(interval);
    };
  }, [idToken, userId, sync]);

  const dismissRejection = useCallback(() => {
    if (!userId) return;
    const rest = rejections.slice(1);
    setRejections(rest);
    saveRejections(userId, rest).catch(() => {});
  }, [rejections, userId]);

  return { rejection: rejections[0] ?? null, dismissRejection };
}
