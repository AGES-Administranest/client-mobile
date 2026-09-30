import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import {
  loadClientOutbox,
  loadClientRejections,
  saveClientRejections,
  subscribeOfflineClients,
  syncPendingClinics,
  type ClientSyncRejection,
} from 'features/clients';

import type { SyncRejection } from '../domain/offlineAppointments';
import { syncPendingAppointments } from '../services/appointmentSyncService';
import {
  loadOutbox,
  loadRejections,
  saveRejections,
  subscribeOfflineAppointments,
} from '../services/offlineAppointmentStore';

// Sem biblioteca de conectividade no app, a volta da rede é percebida
// tentando: ao abrir o app, ao voltar do segundo plano, quando algo entra
// numa fila e, enquanto houver pendências, a cada 30 s.
const RETRY_INTERVAL_MS = 30_000;

export type OfflineSyncRejection =
  | { kind: 'clinic'; rejection: ClientSyncRejection }
  | { kind: 'appointment'; rejection: SyncRejection };

export type AppointmentSyncState = {
  /** O primeiro envio que o backend recusou, para avisar o usuário. */
  rejection: OfflineSyncRejection | null;
  dismissRejection: () => void;
};

export function useAppointmentSync(): AppointmentSyncState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [clinicRejections, setClinicRejections] = useState<
    ClientSyncRejection[]
  >([]);
  const [appointmentRejections, setAppointmentRejections] = useState<
    SyncRejection[]
  >([]);

  const sync = useCallback(async () => {
    if (!idToken || !userId) return;
    try {
      // Clínicas primeiro: um agendamento da fila pode apontar para uma
      // clínica cadastrada offline e só sai depois dela.
      await syncPendingClinics(idToken, userId);
      await syncPendingAppointments(idToken, userId);
    } finally {
      setClinicRejections(await loadClientRejections(userId));
      setAppointmentRejections(await loadRejections(userId));
    }
  }, [idToken, userId]);

  useEffect(() => {
    if (!idToken || !userId) {
      setClinicRejections([]);
      setAppointmentRejections([]);
      return;
    }
    const run = () => {
      sync().catch(() => {});
    };
    run();

    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') run();
    });
    const unsubscribeAppointments = subscribeOfflineAppointments(run);
    const unsubscribeClients = subscribeOfflineClients(run);
    const interval = setInterval(() => {
      Promise.all([loadClientOutbox(userId), loadOutbox(userId)]).then(
        ([clinics, appointments]) => {
          if (clinics.length > 0 || appointments.length > 0) run();
        },
      );
    }, RETRY_INTERVAL_MS);

    return () => {
      appState.remove();
      unsubscribeAppointments();
      unsubscribeClients();
      clearInterval(interval);
    };
  }, [idToken, userId, sync]);

  const dismissRejection = useCallback(() => {
    if (!userId) return;
    if (clinicRejections.length > 0) {
      const rest = clinicRejections.slice(1);
      setClinicRejections(rest);
      saveClientRejections(userId, rest).catch(() => {});
      return;
    }
    const rest = appointmentRejections.slice(1);
    setAppointmentRejections(rest);
    saveRejections(userId, rest).catch(() => {});
  }, [appointmentRejections, clinicRejections, userId]);

  const rejection: OfflineSyncRejection | null = clinicRejections[0]
    ? { kind: 'clinic', rejection: clinicRejections[0] }
    : appointmentRejections[0]
    ? { kind: 'appointment', rejection: appointmentRejections[0] }
    : null;

  return { rejection, dismissRejection };
}
